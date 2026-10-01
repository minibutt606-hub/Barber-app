import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PARAGON_ID = "cfb0f888-d012-443f-8717-a0c9d1556c9c";

export const getAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: roles, error } = await context.supabase.from("user_roles")
      .select("role").eq("user_id", context.userId).eq("salon_id", PARAGON_ID);
    if (error) throw new Error("Could not check access");
    const { data: salon } = await context.supabase.from("salons")
      .select("owner_id").eq("id", PARAGON_ID).maybeSingle();
    const { data: request } = await context.supabase.from("access_requests")
      .select("status").eq("user_id", context.userId).maybeSingle();
    const owner = salon?.owner_id === context.userId;
    return { allowed: (roles?.length ?? 0) > 0, owner, admin: owner || !!roles?.some((r) => r.role === "admin"), status: request?.status ?? null };
  });

export const requestAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: role } = await context.supabase.from("user_roles")
      .select("id").eq("user_id", context.userId).eq("salon_id", PARAGON_ID).limit(1).maybeSingle();
    if (role) return { status: "approved" };
    const { data: existing } = await context.supabase.from("access_requests")
      .select("status").eq("user_id", context.userId).maybeSingle();
    if (existing) return existing;
    const email = context.claims.email;
    if (typeof email !== "string" || !z.string().email().max(255).safeParse(email).success) throw new Error("A valid email is required");
    const { error } = await context.supabase.from("access_requests")
      .insert({ user_id: context.userId, email });
    if (error) throw new Error("Could not send access request");
    return { status: "pending" };
  });

export const getAccessRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertManager(context);
    const { data, error } = await context.supabase.from("access_requests")
      .select("id,email,status,created_at").eq("status", "pending").order("created_at");
    if (error) throw new Error("Could not load requests");
    return data ?? [];
  });

export const reviewAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid(), decision: z.enum(["approved", "rejected"]) }).parse(input))
  .handler(async ({ context, data }) => {
    await assertManager(context);
    const { data: request } = await context.supabase.from("access_requests")
      .select("user_id,status").eq("id", data.id).maybeSingle();
    if (!request || request.status !== "pending") throw new Error("Request is no longer pending");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.decision === "approved") {
      const { error } = await supabaseAdmin.from("user_roles").upsert(
        { user_id: request.user_id, salon_id: PARAGON_ID, role: "staff" },
        { onConflict: "user_id,role" },
      );
      if (error) throw new Error("Could not grant access");
    }
    const { error } = await supabaseAdmin.from("access_requests").update({ status: data.decision }).eq("id", data.id);
    if (error) throw new Error("Could not update request");
    return { ok: true };
  });

export const getMySalon = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("salons")
      .select("id,name,tagline,address,phone,whatsapp,open_from,open_to")
      .eq("id", PARAGON_ID).maybeSingle();
    if (error) throw new Error("Could not load salon");
    return data;
  });

async function assertManager(ctx: { supabase: any; userId: string }) {
  const { data: salon } = await ctx.supabase.from("salons").select("owner_id").eq("id", PARAGON_ID).maybeSingle();
  if (salon?.owner_id === ctx.userId) return { ownerId: ctx.userId };
  const { data: roles } = await ctx.supabase.from("user_roles").select("role")
    .eq("user_id", ctx.userId).eq("salon_id", PARAGON_ID).eq("role", "admin");
  if (!roles?.length) throw new Error("Only the owner or an admin can manage the team");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: s } = await supabaseAdmin.from("salons").select("owner_id").eq("id", PARAGON_ID).single();
  return { ownerId: s?.owner_id as string };
}

export const getTeam = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { ownerId } = await assertManager(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin.from("user_roles").select("user_id,role").eq("salon_id", PARAGON_ID);
    if (error) throw new Error("Could not load team");
    const ids = Array.from(new Set([ownerId, ...(rows ?? []).map((r) => r.user_id)]));
    const members = await Promise.all(ids.map(async (id) => {
      const { data } = await supabaseAdmin.auth.admin.getUserById(id);
      const roles = (rows ?? []).filter((r) => r.user_id === id).map((r) => r.role as string);
      return { userId: id, email: data.user?.email ?? "Unknown", isOwner: id === ownerId, isAdmin: id === ownerId || roles.includes("admin") };
    }));
    return members.sort((a, b) => Number(b.isOwner) - Number(a.isOwner) || Number(b.isAdmin) - Number(a.isAdmin));
  });

export const setAdminRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ email: z.string().trim().email().max(255), admin: z.boolean() }).parse(input))
  .handler(async ({ context, data }) => {
    const { ownerId } = await assertManager(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.toLowerCase();
    let target: string | undefined;
    for (let page = 1; page <= 10 && !target; page++) {
      const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) throw new Error("Could not look up account");
      target = list.users.find((u) => u.email?.toLowerCase() === email)?.id;
      if (list.users.length < 200) break;
    }
    if (!target) throw new Error("No signed-up account uses that email. Ask them to sign up first.");
    if (target === ownerId) throw new Error("The owner always has full access");
    if (data.admin) {
      const { error } = await supabaseAdmin.from("user_roles").upsert(
        [{ user_id: target, salon_id: PARAGON_ID, role: "admin" }, { user_id: target, salon_id: PARAGON_ID, role: "staff" }],
        { onConflict: "user_id,role" },
      );
      if (error) throw new Error("Could not grant admin role");
      await supabaseAdmin.from("access_requests").update({ status: "approved" }).eq("user_id", target).eq("status", "pending");
    } else {
      const { error } = await supabaseAdmin.from("user_roles").delete()
        .eq("user_id", target).eq("salon_id", PARAGON_ID).eq("role", "admin");
      if (error) throw new Error("Could not remove admin role");
    }
    return { ok: true };
  });
