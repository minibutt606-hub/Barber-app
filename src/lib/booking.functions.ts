import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const availabilitySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  staffId: z.string().uuid().nullable().optional(),
});

const bookingSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z
    .string()
    .trim()
    .min(7)
    .max(20)
    .regex(/^[+0-9 ()-]+$/, "Invalid phone number"),
  notes: z.string().trim().max(500).optional().nullable(),
  serviceIds: z.array(z.string().uuid()).min(1).max(10),
  staffId: z.string().uuid().nullable().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
});

export const getBookedSlots = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => availabilitySchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let query = supabaseAdmin
      .from("appointments")
      .select("start_time, staff_id")
      .eq("appointment_date", data.date)
      .neq("status", "cancelled");
    if (data.staffId) query = query.eq("staff_id", data.staffId);
    const { data: rows, error } = await query;
    if (error) throw new Error("Could not load availability");
    return (rows ?? []).map((r) => String(r.start_time).slice(0, 5));
  });

export const createBooking = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => bookingSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: services, error: svcError } = await supabaseAdmin
      .from("services")
      .select("id, name, price, duration_minutes")
      .in("id", data.serviceIds)
      .eq("is_active", true);
    if (svcError || !services || services.length === 0) {
      throw new Error("Selected services are unavailable");
    }

    const total = services.reduce((sum, s) => sum + Number(s.price), 0);
    const phone = data.phone.replace(/[^\d+]/g, "");

    const { data: existing } = await supabaseAdmin
      .from("customers")
      .select("id")
      .eq("phone", phone)
      .maybeSingle();

    let customerId = existing?.id ?? null;
    if (!customerId) {
      const { data: inserted, error: custError } = await supabaseAdmin
        .from("customers")
        .insert({ name: data.name, phone })
        .select("id")
        .single();
      if (custError || !inserted) throw new Error("Could not save your details");
      customerId = inserted.id;
    }

    let staffId = data.staffId ?? null;
    if (!staffId) {
      const { data: freeStaff } = await supabaseAdmin
        .from("staff")
        .select("id")
        .eq("is_active", true);
      const { data: busy } = await supabaseAdmin
        .from("appointments")
        .select("staff_id")
        .eq("appointment_date", data.date)
        .eq("start_time", data.time)
        .neq("status", "cancelled");
      const busyIds = new Set((busy ?? []).map((b) => b.staff_id));
      staffId = (freeStaff ?? []).find((s) => !busyIds.has(s.id))?.id ?? null;
    }

    const bookingCode = `SLN-${Math.floor(100000 + Math.random() * 900000)}`;

    const { data: appointment, error } = await supabaseAdmin
      .from("appointments")
      .insert({
        booking_code: bookingCode,
        customer_id: customerId,
        staff_id: staffId,
        service_ids: services.map((s) => s.id),
        appointment_date: data.date,
        start_time: data.time,
        total_amount: total,
        status: "pending",
        notes: data.notes ?? null,
      })
      .select("id, booking_code")
      .single();

    if (error || !appointment) throw new Error("Could not create the booking");

    return {
      bookingCode: appointment.booking_code,
      total,
      services: services.map((s) => ({ name: s.name, price: Number(s.price) })),
    };
  });
