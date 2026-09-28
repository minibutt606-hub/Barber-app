import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PARAGON_ID = "cfb0f888-d012-443f-8717-a0c9d1556c9c";

export const getAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: role, error } = await context.supabase.from("user_roles")
      .select("role").eq("user_id", context.userId).eq("salon_id", PARAGON_ID).maybeSingle();
    if (error) throw new Error("Could not check access");
    const { data: salon } = await context.supabase.from("salons")
      .select("owner_id").eq("id", PARAGON_ID).maybeSingle();
    const { data: request } = await context.supabase.from("access_requests")
      .select("status").eq("user_id", context.userId).maybeSingle();
    return { allowed: !!role, owner: salon?.owner_id === context.userId, status: request?.status ?? null };
  });

export const requestAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: role } = await context.supabase.from("user_roles")
      .select("id").eq("user_id", context.userId).eq("salon_id", PARAGON_ID).maybeSingle();
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
    const { data: salon } = await context.supabase.from("salons")
      .select("owner_id").eq("id", PARAGON_ID).maybeSingle();
    if (salon?.owner_id !== context.userId) throw new Error("Not authorized");
    const { data, error } = await context.supabase.from("access_requests")
      .select("id,email,status,created_at").eq("status", "pending").order("created_at");
    if (error) throw new Error("Could not load requests");
    return data ?? [];
  });

export const reviewAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid(), decision: z.enum(["approved", "rejected"]) }).parse(input))
  .handler(async ({ context, data }) => {
    const { data: salon } = await context.supabase.from("salons")
      .select("owner_id").eq("id", PARAGON_ID).maybeSingle();
    if (salon?.owner_id !== context.userId) throw new Error("Not authorized");
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
