import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "salon"
  );
}

const setupSchema = z.object({
  salonName: z.string().trim().min(2).max(60).optional().nullable(),
});

/**
 * Called right after sign-up / sign-in.
 * Every account gets its OWN salon workspace (multi-tenant SaaS):
 * a fresh salon row plus an admin role scoped to that salon.
 */
export const ensureSalonWorkspace = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => setupSchema.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: mine } = await supabaseAdmin
      .from("user_roles")
      .select("role, salon_id")
      .eq("user_id", context.userId)
      .limit(1);

    const existing = mine?.[0];
    if (existing) {
      const { data: salon } = await supabaseAdmin
        .from("salons")
        .select("id, name, slug")
        .eq("id", existing.salon_id)
        .maybeSingle();
      return {
        role: existing.role as string,
        created: false,
        salon: salon ?? null,
      };
    }

    const base = slugify(data.salonName || "salon");
    let slug = base;
    for (let i = 0; i < 20; i += 1) {
      const { data: taken } = await supabaseAdmin
        .from("salons")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (!taken) break;
      slug = `${base}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const { data: salon, error: salonError } = await supabaseAdmin
      .from("salons")
      .insert({
        owner_id: context.userId,
        name: data.salonName?.trim() || "My Salon",
        slug,
      })
      .select("id, name, slug")
      .single();
    if (salonError || !salon) throw new Error("Could not create your salon workspace");

    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: context.userId, role: "admin", salon_id: salon.id });
    if (roleError) throw new Error("Could not set up the owner account");

    return { role: "admin", created: true, salon };
  });

const updateSchema = z.object({
  name: z.string().trim().min(2).max(60),
  tagline: z.string().trim().max(80).optional().nullable(),
  address: z.string().trim().max(120).optional().nullable(),
  phone: z.string().trim().max(30).optional().nullable(),
  whatsapp: z.string().trim().max(20).optional().nullable(),
  open_from: z.string().trim().max(12).optional().nullable(),
  open_to: z.string().trim().max(12).optional().nullable(),
});

export const getMySalon = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("salons")
      .select("id, name, slug, tagline, address, phone, whatsapp, open_from, open_to")
      .limit(1)
      .maybeSingle();
    if (error) throw new Error("Could not load your salon");
    return data;
  });

export const updateMySalon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => updateSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("salons")
      .update({
        name: data.name,
        tagline: data.tagline || "Precision grooming, royal treatment",
        address: data.address ?? null,
        phone: data.phone ?? null,
        whatsapp: (data.whatsapp ?? "").replace(/\D/g, "") || null,
        open_from: data.open_from || "11:00 AM",
        open_to: data.open_to || "3:00 AM",
      })
      .eq("owner_id", context.userId);
    if (error) throw new Error("Could not save your salon details");
    return { ok: true };
  });
