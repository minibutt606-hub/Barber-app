# Gilded Glow

Create a production-ready, ultra-premium Salon Management & Public Client Booking SaaS Web App using React, Tailwind CSS, Lucide React icons, and Supabase.

---
DESIGN SYSTEM & AESTHETICS:
- Theme: Dark luxury glassmorphism (slate-950/zinc-950 base, warm gold/amber accents #f59e0b, emerald #10b981 for success states).
- UI Polish: Rounded-3xl containers, backdrop-blur-xl cards, subtle border highlights, smooth micro-interactions, mobile-first responsive layout.
- Layout Architecture: 
  1. Public Route: `/` or `/book` (Mobile-First Client Booking Portal)
  2. Protected Admin Route: `/admin` (Salon POS, Live Bookings, Analytics, Staff & Catalog)

---
DATABASE SCHEMA (Generate Supabase Tables & Relations):
1. `services` (id, name, category, price, duration_minutes, description, is_active)
   - Pre-populate default services: Haircuts, Beard Styling, Facial & Skin Care, Royal Groom Package.
2. `staff` (id, name, phone, role, commission_rate, is_active)
   - Pre-populate default staff: Master Barber, Hair Stylist, Skin Specialist.
3. `customers` (id, name, phone UNIQUE, total_visits, total_spent, notes)
4. `appointments` (id, booking_code UNIQUE, customer_id, staff_id, service_ids array, appointment_date, start_time, total_amount, status ['pending', 'confirmed', 'in-service', 'completed', 'cancelled'], notes, created_at)
5. `invoices` (id, invoice_no UNIQUE, customer_id, staff_id, items jsonb, subtotal, discount_pct, total_amount, paid_amount, due_amount, payment_method ['Cash', 'Card', 'JazzCash', 'EasyPaisa'], created_at)
6. `expenses` (id, title, category ['Rent', 'Utilities', 'Products', 'Staff Salary', 'Tea/Refreshments'], amount, expense_date)

---
MODULE 1: PUBLIC CLIENT BOOKING PORTAL (`/book`)
Step-by-step interactive booking flow designed for mobile users:
- Step 1: Category tabs with smooth filter (Hair, Beard, Skin, Packages). Multi-select services showing live running total (Price & Duration).
- Step 2: Preferred Stylist picker (Card avatars + "Any Available" option) + Date picker + 30-minute interval dynamic slot grid (e.g. 11:00 AM to 10:00 PM).
- Step 3: Customer contact details form (Full Name, WhatsApp Phone Number, Special Notes).
- Step 4: Booking Confirmation Screen:
  - Generates unique Reference Code (e.g. SLN-849201).
  - Summary card with dates, service breakdown, and total price.
  - "Confirm on WhatsApp" button that automatically creates a pre-formatted WhatsApp message link (`wa.me`) addressed to the salon with all booking specifics.

---
MODULE 2: SALON ADMIN & POS DASHBOARD (`/admin`)
Navigation with real-time indicator:
1. Live Bookings & Appointments Board:
   - Supabase Realtime channel listener: when a client books on `/book`, a notification sound triggers and the appointment card pops up immediately without page reload.
   - Action controls: Accept, Start Service, Mark Completed, or Cancel.
   - "Convert to Invoice" button: 1-click loads appointment services & customer info directly into the POS screen.

2. Point of Sale (POS) & Fast Invoicing:
   - Quick search/add services grid with quantity increments.
   - Customer phone search with auto-fill or quick add.
   - Dynamic Calculations: Subtotal, Discount (% or Flat), Total Payable, Paid Amount, and Balance Due calculation.
   - Payment method toggle (Cash, Card, JazzCash, EasyPaisa).
   - "Print & Settle" action: Formats receipt to standard 80mm thermal printer layout (`@media print`) and downloads PDF receipt.
   - "WhatsApp Receipt" button to send invoice breakdown directly to client's phone.

3. Financials, Dues & Analytics:
   - KPI metric cards: Today's Revenue, Outstanding Customer Dues, Monthly Net Profit, Total Appointments.
   - Expense Tracker: Modal to quickly record salon operational costs and filter by category.
   - Customer Ledger: Search customers to see outstanding balances and collect due payments in 1-click.

4. Staff & Services Catalog Manager:
   - Add/edit services, update prices, change category.
   - Staff performance overview: calculate daily/monthly commission based on completed invoices.

Include mock data so the app looks completely filled and interactive right from the first load!

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/4ff6250c-ea98-4b34-911b-2a0e6443122a).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
