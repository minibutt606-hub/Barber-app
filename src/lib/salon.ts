export const SALON = {
  name: "Paragon Barber",
  tagline: "Precision grooming, royal treatment",
  address: "Shah Chowk near Chaman",
  phone: "+92 300 000 0000",
  /** WhatsApp number in international format, digits only. */
  whatsapp: "923000000000",
  openFrom: "11:00 AM",
  openTo: "3:00 AM",
} as const;

export const CURRENCY = "Rs";

export function formatMoney(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  return `${CURRENCY} ${n.toLocaleString("en-PK", { maximumFractionDigits: 0 })}`;
}

export const SERVICE_CATEGORIES = ["Hair", "Beard", "Skin", "Packages"] as const;
export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number];

export const PAYMENT_METHODS = ["Cash", "Card", "JazzCash", "EasyPaisa"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const EXPENSE_CATEGORIES = [
  "Rent",
  "Utilities",
  "Products",
  "Staff Salary",
  "Tea/Refreshments",
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const APPOINTMENT_STATUSES = [
  "pending",
  "confirmed",
  "in-service",
  "completed",
  "cancelled",
] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

/** 30-minute slots between 11:00 and 22:00 (last start 21:30). */
export function buildTimeSlots(): string[] {
  const slots: string[] = [];
  for (let minutes = 11 * 60; minutes <= 21 * 60 + 30; minutes += 30) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }
  return slots;
}

export function formatTime(value: string): string {
  const [hStr, mStr] = value.split(":");
  const h = Number(hStr);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${mStr ?? "00"} ${suffix}`;
}

export function formatDate(value: string): string {
  const d = new Date(`${value}T00:00:00`);
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function todayISO(): string {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function whatsappLink(phoneDigits: string, message: string): string {
  const to = phoneDigits.replace(/\D/g, "");
  return `https://wa.me/${to}?text=${encodeURIComponent(message)}`;
}
