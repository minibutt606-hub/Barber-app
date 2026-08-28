# Paragon Barber — Salon Booking & POS

A dark-luxury glassmorphism web app with two sides: a mobile-first public booking portal for clients, and a password-protected admin dashboard for running the salon (live bookings, POS invoicing, financials, staff & catalog).

## Design

Slate-950/zinc-950 base, warm gold/amber (#f59e0b) accents, emerald for success, rounded-3xl glass cards with backdrop blur, soft border highlights and subtle hover/press micro-interactions. All colors go into the design system tokens so the look stays consistent. Lucide icons throughout.

## Module 1 — Public booking portal (`/` and `/book`)

Four-step flow, mobile-first:
1. Category tabs (Hair, Beard, Skin, Packages) with multi-select service cards and a live running total of price + duration.
2. Stylist picker (avatar cards + "Any Available"), date picker, and a 30-minute slot grid from 11:00 AM to 10:00 PM; slots already booked for that stylist/date are disabled.
3. Contact form: full name, WhatsApp number, special notes (validated).
4. Confirmation: generated reference code (SLN-XXXXXX), summary card with services, stylist, date/time and total, plus a "Confirm on WhatsApp" button that opens a pre-filled wa.me message to the salon.

## Module 2 — Admin dashboard (`/admin`)

Sign-in with email + password protects everything under `/admin`. Sections:

1. **Live bookings board** — appointments grouped by status, updating in real time when a client books (notification sound + card animates in, no reload). Actions: Accept, Start Service, Mark Completed, Cancel, and "Convert to Invoice" which preloads the POS.
2. **POS & invoicing** — searchable service grid with quantity steppers, customer lookup by phone with auto-fill or quick-add, live subtotal / discount (% or flat) / total / paid / balance due, payment method toggle (Cash, Card, JazzCash, EasyPaisa), "Print & Settle" producing an 80mm thermal receipt layout via print styles, and "WhatsApp Receipt" sending the breakdown to the client.
3. **Financials & analytics** — KPI cards (today's revenue, outstanding dues, monthly net profit, total appointments), expense tracker modal with category filtering, and a customer ledger to find outstanding balances and collect dues in one click.
4. **Staff & catalog** — add/edit services (price, category, duration, active), manage staff, and a performance view computing daily/monthly commission from completed invoices.

## Data

Lovable Cloud backend with tables: `services`, `staff`, `customers`, `appointments`, `invoices`, `expenses` — exactly the fields specified, with realtime enabled on appointments.

Seeded so the app looks alive on first load: default services (Haircuts, Beard Styling, Facial & Skin Care, Royal Groom Package plus variants), staff (Master Barber, Hair Stylist, Skin Specialist), a set of customers, today's appointments across all statuses, recent invoices (some with dues), and this month's expenses.

## Technical notes

- TanStack Start routes: `/` (booking portal), `/book`, `/auth` (admin sign-in), and `/admin/*` under the protected layout.
- Public booking writes go through a server function with Zod validation; RLS keeps `services`/`staff` publicly readable while customers, appointments, invoices and expenses are admin-only reads. Booking inserts happen server-side so client data can't be enumerated.
- Realtime via a Supabase channel on `appointments` in the bookings board.
- Receipt printing uses a dedicated `@media print` 80mm stylesheet; PDF is the browser's print-to-PDF from the same layout.
- Currency defaults to PKR and the salon WhatsApp number is stored in one config file — tell me the number and I'll wire it in (a placeholder is used until then).

## Build order

1. Enable Cloud, create schema + RLS + seed data.
2. Design system and shared glass UI primitives.
3. Public booking flow end-to-end.
4. Admin auth + shell + live bookings board.
5. POS, receipts, WhatsApp receipt.
6. Financials, expenses, ledger, staff & catalog manager.
