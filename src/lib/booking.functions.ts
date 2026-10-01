import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const PARAGON_ID = "cfb0f888-d012-443f-8717-a0c9d1556c9c";
const availabilitySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  staffId: z.string().uuid().nullable().optional(),
});
const bookingSchema = availabilitySchema.extend({
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(7).max(20).regex(/^[+0-9 ()-]+$/, "Invalid phone number"),
  notes: z.string().trim().max(500).optional().nullable(),
  serviceIds: z.array(z.string().uuid()).min(1).max(10),
  time: z.string().regex(/^(1\d|2[0-3]):(00|30)$/, "Bookings are available 10:00 AM – 12:00 AM"),
});

export const getSalonPortal = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: salon, error } = await supabaseAdmin.from("salons")
    .select("name,tagline,address,phone,whatsapp,open_from,open_to").eq("id", PARAGON_ID).maybeSingle();
  if (error || !salon) throw new Error("Salon unavailable");
  const [{ data: services, error: serviceError }, { data: staff, error: staffError }] = await Promise.all([
    supabaseAdmin.from("services").select("id,name,category,price,duration_minutes,description")
      .eq("salon_id", PARAGON_ID).eq("is_active", true).order("price"),
    supabaseAdmin.from("staff").select("id,name,role")
      .eq("salon_id", PARAGON_ID).eq("is_active", true).order("name"),
  ]);
  if (serviceError || staffError) throw new Error("Could not load booking options");
  return { salon, services: services ?? [], staff: staff ?? [] };
});

export const getBookedSlots = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => availabilitySchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let query = supabaseAdmin.from("appointments").select("start_time,staff_id")
      .eq("salon_id", PARAGON_ID).eq("appointment_date", data.date).neq("status", "cancelled");
    if (data.staffId) query = query.eq("staff_id", data.staffId);
    const { data: rows, error } = await query;
    if (error) throw new Error("Could not load availability");
    return (rows ?? []).map((r) => String(r.start_time).slice(0, 5));
  });

export const createBooking = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => bookingSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: services, error: svcError } = await supabaseAdmin.from("services")
      .select("id,name,price,duration_minutes").eq("salon_id", PARAGON_ID)
      .in("id", data.serviceIds).eq("is_active", true);
    if (svcError || !services || services.length !== new Set(data.serviceIds).size) throw new Error("Selected services are unavailable");
    if (data.staffId) {
      const { data: stylist } = await supabaseAdmin.from("staff").select("id")
        .eq("id", data.staffId).eq("salon_id", PARAGON_ID).eq("is_active", true).maybeSingle();
      if (!stylist) throw new Error("Selected stylist is unavailable");
    }
    const { data: busy, error: busyError } = await supabaseAdmin.from("appointments")
      .select("staff_id").eq("salon_id", PARAGON_ID).eq("appointment_date", data.date)
      .eq("start_time", data.time).neq("status", "cancelled");
    if (busyError) throw new Error("Could not check availability");
    if (data.staffId && busy?.some((b) => b.staff_id === data.staffId)) throw new Error("This stylist is already booked");
    const phone = data.phone.replace(/[^\d+]/g, "");
    const { data: existing } = await supabaseAdmin.from("customers").select("id,penalty_active")
      .eq("salon_id", PARAGON_ID).eq("phone", phone).maybeSingle();
    if (existing?.penalty_active) throw new Error("PENALTY: You have a pending late arrival penalty. Please settle it with the salon to proceed.");
    let customerId = existing?.id;
    if (!customerId) {
      const { data: inserted, error } = await supabaseAdmin.from("customers")
        .insert({ name: data.name, phone, salon_id: PARAGON_ID }).select("id").single();
      if (error || !inserted) throw new Error("Could not save your details");
      customerId = inserted.id;
    }
    let staffId = data.staffId ?? null;
    if (!staffId) {
      const { data: freeStaff } = await supabaseAdmin.from("staff").select("id")
        .eq("salon_id", PARAGON_ID).eq("is_active", true);
      const busyIds = new Set((busy ?? []).map((b) => b.staff_id));
      staffId = (freeStaff ?? []).find((s) => !busyIds.has(s.id))?.id ?? null;
    }
    const total = services.reduce((sum, s) => sum + Number(s.price), 0);
    const bookingCode = `SLN-${Math.floor(100000 + Math.random() * 900000)}`;
    const { data: appointment, error } = await supabaseAdmin.from("appointments")
      .insert({ salon_id: PARAGON_ID, booking_code: bookingCode, customer_id: customerId,
        staff_id: staffId, service_ids: services.map((s) => s.id), appointment_date: data.date,
        start_time: data.time, total_amount: total, status: "pending", notes: data.notes ?? null })
      .select("id,booking_code").single();
    if (error || !appointment) throw new Error("Could not create the booking");
    return { bookingCode: appointment.booking_code, total,
      services: services.map((s) => ({ name: s.name, price: Number(s.price) })) };
  });
