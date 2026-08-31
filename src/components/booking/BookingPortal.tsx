import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  Clock,
  Crown,
  Loader2,
  MapPin,
  MessageCircle,
  Scissors,
  Sparkles,
  User,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { createBooking, getBookedSlots } from "@/lib/booking.functions";
import {
  SALON,
  SERVICE_CATEGORIES,
  buildTimeSlots,
  formatDate,
  formatDuration,
  formatMoney,
  formatTime,
  todayISO,
  whatsappLink,
} from "@/lib/salon";
import { cn } from "@/lib/utils";
import type { Tables } from "@/integrations/supabase/types";

type Service = Pick<
  Tables<"services">,
  "id" | "name" | "category" | "price" | "duration_minutes" | "description"
>;
type Staff = Pick<Tables<"staff">, "id" | "name" | "role">;

const STEPS = ["Services", "Time", "Details", "Done"];

function StepDots({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-2">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center gap-2">
          <div
            className={cn(
              "flex size-7 items-center justify-center rounded-full text-xs font-semibold transition-all",
              i < step
                ? "bg-success/20 text-success"
                : i === step
                  ? "bg-primary text-primary-foreground shadow-[0_0_20px_-4px_var(--color-primary)]"
                  : "bg-white/5 text-muted-foreground",
            )}
          >
            {i < step ? <Check className="size-3.5" /> : i + 1}
          </div>
          {i < STEPS.length - 1 && <div className="h-px w-4 bg-border sm:w-8" />}
        </div>
      ))}
    </div>
  );
}

export default function BookingPortal() {
  const [step, setStep] = useState(0);
  const [category, setCategory] = useState<string>("Hair");
  const [selected, setSelected] = useState<string[]>([]);
  const [staffId, setStaffId] = useState<string | null>(null);
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [confirmation, setConfirmation] = useState<{ bookingCode: string; total: number } | null>(
    null,
  );

  const servicesQuery = useQuery({
    queryKey: ["public-services"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("id, name, category, price, duration_minutes, description")
        .eq("is_active", true)
        .order("price");
      if (error) throw error;
      return data as Service[];
    },
  });

  const staffQuery = useQuery({
    queryKey: ["public-staff"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("public_staff")
        .select("id, name, role")
        .order("name");
      if (error) throw error;
      return (data ?? []) as Staff[];
    },
  });

  const bookedSlotsFn = useServerFn(getBookedSlots);
  const slotsQuery = useQuery({
    queryKey: ["booked-slots", date, staffId],
    queryFn: () => bookedSlotsFn({ data: { date, staffId } }),
    enabled: step === 1,
  });

  const createBookingFn = useServerFn(createBooking);
  const booking = useMutation({
    mutationFn: () =>
      createBookingFn({
        data: { name, phone, notes: notes || null, serviceIds: selected, staffId, date, time: time! },
      }),
    onSuccess: (result) => {
      setConfirmation({ bookingCode: result.bookingCode, total: result.total });
      setStep(3);
    },
    onError: () => toast.error("We couldn't save your booking. Please try again."),
  });

  const services = servicesQuery.data ?? [];
  const staff = staffQuery.data ?? [];
  const chosen = useMemo(
    () => services.filter((s) => selected.includes(s.id)),
    [services, selected],
  );
  const total = chosen.reduce((sum, s) => sum + Number(s.price), 0);
  const duration = chosen.reduce((sum, s) => sum + s.duration_minutes, 0);
  const slots = buildTimeSlots();
  const booked = new Set(slotsQuery.data ?? []);
  const stylistName = staffId ? (staff.find((s) => s.id === staffId)?.name ?? "Any") : "Any available";

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const canContinue =
    (step === 0 && selected.length > 0) ||
    (step === 1 && !!time) ||
    (step === 2 && name.trim().length >= 2 && phone.replace(/\D/g, "").length >= 10);

  const summaryMessage = () =>
    [
      "Assalam-o-Alaikum Paragon Barber! I have booked an appointment.",
      "",
      `*Booking Ref:* ${confirmation?.bookingCode}`,
      `*Name:* ${name}`,
      `*Phone:* ${phone}`,
      `*Services:* ${chosen.map((s) => s.name).join(", ")}`,
      `*Date:* ${formatDate(date)}`,
      `*Time:* ${formatTime(time ?? "")}`,
      `*Total:* ${formatMoney(total)}`,
      "",
      "Please confirm my appointment slot.",
    ].join("\n");

  return (
    <div className="min-h-screen pb-40">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-5 pt-7">
        <div className="flex items-center gap-3">
          <div className="glass flex size-11 items-center justify-center rounded-2xl">
            <Crown className="size-5 text-primary" />
          </div>
          <div>
            <p className="font-display text-xl leading-none font-semibold tracking-wide">
              {SALON.name}
            </p>
            <p className="text-[11px] tracking-[0.2em] text-muted-foreground uppercase">
              {SALON.tagline}
            </p>
          </div>
        </div>
        <Link
          to="/admin"
          className="glass rounded-full px-4 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          Staff login
        </Link>
      </header>

      <main className="mx-auto max-w-3xl px-5">
        <section className="glass mt-6 rounded-3xl p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-medium tracking-wider text-primary uppercase">
              <Sparkles className="size-3" /> Open {SALON.openFrom} – {SALON.openTo}
            </span>
            <span className="glass inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
              <MapPin className="size-3 text-primary" /> {SALON.address}
            </span>
          </div>
          <h1 className="mt-4 font-display text-4xl leading-tight font-semibold sm:text-5xl">
            Book your <span className="gold-text">grooming ritual</span>
          </h1>
          <p className="mt-3 max-w-lg text-sm text-muted-foreground">
            Choose your services, pick your stylist and lock a slot in under a minute. Confirmation
            arrives instantly on WhatsApp.
          </p>
        </section>


        <div className="mt-6 flex items-center justify-between">
          <StepDots step={step} />
          <span className="text-xs text-muted-foreground">
            Step {Math.min(step + 1, 4)} of 4 · {STEPS[step]}
          </span>
        </div>

        {/* STEP 1 — services */}
        {step === 0 && (
          <section className="mt-4">
            <div className="no-scrollbar flex gap-2 overflow-x-auto pb-2">
              {SERVICE_CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-all",
                    category === c
                      ? "bg-primary text-primary-foreground shadow-[0_0_24px_-8px_var(--color-primary)]"
                      : "glass text-muted-foreground hover:text-foreground",
                  )}
                >
                  {c}
                </button>
              ))}
            </div>

            <div className="mt-4 grid gap-3">
              {servicesQuery.isLoading && (
                <div className="glass flex items-center justify-center rounded-3xl p-10">
                  <Loader2 className="size-5 animate-spin text-primary" />
                </div>
              )}
              {services
                .filter((s) => s.category === category)
                .map((s) => {
                  const active = selected.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      onClick={() => toggle(s.id)}
                      className={cn(
                        "group flex items-start gap-4 rounded-3xl p-4 text-left transition-all active:scale-[0.99]",
                        active
                          ? "glass-strong ring-1 ring-primary/60"
                          : "glass hover:ring-1 hover:ring-primary/25",
                      )}
                    >
                      <div
                        className={cn(
                          "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-2xl transition-colors",
                          active ? "bg-primary text-primary-foreground" : "bg-white/5 text-primary",
                        )}
                      >
                        {active ? <Check className="size-4" /> : <span className="size-2.5 rounded-full border border-current opacity-50" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{s.name}</p>
                        {s.description && (
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                            {s.description}
                          </p>
                        )}
                        <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="size-3" /> {formatDuration(s.duration_minutes)}
                        </p>
                      </div>
                      <p className="font-display text-lg font-semibold text-primary">
                        {formatMoney(s.price)}
                      </p>
                    </button>
                  );
                })}
            </div>
          </section>
        )}

        {/* STEP 2 — stylist, date, time */}
        {step === 1 && (
          <section className="mt-4 space-y-5">
            <div>
              <h2 className="mb-3 flex items-center gap-2 font-display text-xl font-semibold">
                <UserRound className="size-4 text-primary" /> Preferred stylist
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <button
                  onClick={() => setStaffId(null)}
                  className={cn(
                    "rounded-3xl p-4 text-center transition-all",
                    staffId === null ? "glass-strong ring-1 ring-primary/60" : "glass",
                  )}
                >
                  <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/15 text-primary">
                    <Sparkles className="size-5" />
                  </div>
                  <p className="mt-2 text-sm font-medium">Any available</p>
                  <p className="text-[11px] text-muted-foreground">Fastest slot</p>
                </button>
                {staff.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setStaffId(m.id)}
                    className={cn(
                      "rounded-3xl p-4 text-center transition-all",
                      staffId === m.id ? "glass-strong ring-1 ring-primary/60" : "glass",
                    )}
                  >
                    <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-white/5 font-display text-lg font-semibold text-primary">
                      {m.name.charAt(0)}
                    </div>
                    <p className="mt-2 text-sm font-medium">{m.name}</p>
                    <p className="text-[11px] text-muted-foreground">{m.role}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h2 className="mb-3 flex items-center gap-2 font-display text-xl font-semibold">
                <CalendarDays className="size-4 text-primary" /> Date
              </h2>
              <input
                type="date"
                value={date}
                min={todayISO()}
                onChange={(e) => {
                  setDate(e.target.value);
                  setTime(null);
                }}
                className="glass w-full rounded-2xl px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-primary/60"
              />
            </div>

            <div>
              <h2 className="mb-3 flex items-center gap-2 font-display text-xl font-semibold">
                <Clock className="size-4 text-primary" /> Available slots
              </h2>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {slots.map((slot) => {
                  const isBooked = booked.has(slot);
                  return (
                    <button
                      key={slot}
                      disabled={isBooked}
                      onClick={() => setTime(slot)}
                      className={cn(
                        "rounded-2xl py-2.5 text-xs font-medium transition-all",
                        isBooked
                          ? "cursor-not-allowed bg-white/[0.03] text-muted-foreground/40 line-through"
                          : time === slot
                            ? "bg-primary text-primary-foreground shadow-[0_0_24px_-8px_var(--color-primary)]"
                            : "glass hover:ring-1 hover:ring-primary/40",
                      )}
                    >
                      {formatTime(slot)}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* STEP 3 — details */}
        {step === 2 && (
          <section className="glass mt-4 space-y-4 rounded-3xl p-6">
            <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
              <User className="size-4 text-primary" /> Your details
            </h2>
            <div>
              <label className="text-xs text-muted-foreground">Full name</label>
              <input
                value={name}
                maxLength={80}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ahmed Raza"
                className="mt-1 w-full rounded-2xl bg-white/5 px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-primary/60"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">WhatsApp number</label>
              <input
                value={phone}
                maxLength={20}
                inputMode="tel"
                onChange={(e) => setPhone(e.target.value)}
                placeholder="03XXXXXXXXX"
                className="mt-1 w-full rounded-2xl bg-white/5 px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-primary/60"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Special notes (optional)</label>
              <textarea
                value={notes}
                maxLength={500}
                rows={3}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Fade preference, allergies, occasion…"
                className="mt-1 w-full resize-none rounded-2xl bg-white/5 px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-primary/60"
              />
            </div>
          </section>
        )}

        {/* STEP 4 — confirmation */}
        {step === 3 && confirmation && (
          <section className="glass-strong mt-4 rounded-3xl p-6 text-center sm:p-8">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-success/15 text-success">
              <Check className="size-7" />
            </div>
            <h2 className="mt-4 font-display text-3xl font-semibold">Booking requested</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Send it on WhatsApp so we can confirm your slot instantly.
            </p>
            <p className="mt-5 text-[11px] tracking-[0.25em] text-muted-foreground uppercase">
              Reference code
            </p>
            <p className="gold-text font-display text-4xl font-bold tracking-wider">
              {confirmation.bookingCode}
            </p>

            <div className="mt-6 space-y-3 rounded-3xl bg-white/[0.04] p-5 text-left text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Guest</span>
                <span className="font-medium">{name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Stylist</span>
                <span className="font-medium">{stylistName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">When</span>
                <span className="font-medium">
                  {formatDate(date)} · {formatTime(time ?? "")}
                </span>
              </div>
              <div className="h-px bg-border" />
              {chosen.map((s) => (
                <div key={s.id} className="flex justify-between">
                  <span className="text-muted-foreground">{s.name}</span>
                  <span>{formatMoney(s.price)}</span>
                </div>
              ))}
              <div className="h-px bg-border" />
              <div className="flex justify-between text-base">
                <span className="font-medium">Total ({formatDuration(duration)})</span>
                <span className="font-display font-bold text-primary">{formatMoney(total)}</span>
              </div>
            </div>

            <a
              href={whatsappLink(SALON.whatsapp, summaryMessage())}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-success px-6 py-3.5 text-sm font-semibold text-success-foreground transition-transform active:scale-[0.98]"
            >
              <MessageCircle className="size-4" /> Confirm on WhatsApp
            </a>
            <button
              onClick={() => {
                setStep(0);
                setSelected([]);
                setTime(null);
                setConfirmation(null);
                setName("");
                setPhone("");
                setNotes("");
              }}
              className="mt-3 w-full rounded-full px-6 py-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Make another booking
            </button>
          </section>
        )}
      </main>

      {/* Sticky summary bar */}
      {step < 3 && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-3xl items-center gap-3 px-5 py-4">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-muted-foreground">
                {selected.length ? `${selected.length} service(s) · ${formatDuration(duration)}` : "No services selected"}
              </p>
              <p className="font-display text-2xl font-semibold text-primary">
                {formatMoney(total)}
              </p>
            </div>
            {step > 0 && (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="glass flex size-11 items-center justify-center rounded-full text-muted-foreground"
                aria-label="Back"
              >
                <ArrowLeft className="size-4" />
              </button>
            )}
            <button
              disabled={!canContinue || booking.isPending}
              onClick={() => (step === 2 ? booking.mutate() : setStep((s) => s + 1))}
              className={cn(
                "flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-all active:scale-[0.98]",
                canContinue && !booking.isPending
                  ? "bg-primary text-primary-foreground shadow-[0_0_30px_-10px_var(--color-primary)]"
                  : "cursor-not-allowed bg-white/5 text-muted-foreground",
              )}
            >
              {booking.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  {step === 2 ? "Confirm booking" : "Continue"}
                  <ArrowRight className="size-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
