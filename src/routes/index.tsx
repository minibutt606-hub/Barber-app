import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, CalendarCheck, Crown, ShoppingBag, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SalonOS — Booking & POS for Modern Salons" },
      {
        name: "description",
        content:
          "Run your salon on one platform: a public booking portal for your clients plus a live bookings board, point of sale and analytics for your team.",
      },
      { property: "og:title", content: "SalonOS — Booking & POS for Modern Salons" },
      {
        property: "og:description",
        content: "Create your salon workspace in seconds and share your booking link.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

const FEATURES = [
  {
    icon: CalendarCheck,
    title: "Client booking portal",
    body: "Your own link where clients pick services, stylist and slot, then confirm on WhatsApp.",
  },
  {
    icon: ShoppingBag,
    title: "Point of sale",
    body: "Bill in seconds with discounts, part payments, thermal receipts and WhatsApp invoices.",
  },
  {
    icon: Sparkles,
    title: "Live analytics",
    body: "Revenue, dues, staff commission and popular services — all from your real transactions.",
  },
];

function LandingPage() {
  const navigate = useNavigate();
  const [slug, setSlug] = useState("");

  function openSalon(e: React.FormEvent) {
    e.preventDefault();
    const clean = slug
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "");
    if (clean) navigate({ to: "/book/$slug", params: { slug: clean } });
  }

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 pt-7">
        <div className="flex items-center gap-3">
          <div className="glass flex size-11 items-center justify-center rounded-2xl">
            <Crown className="size-5 text-primary" />
          </div>
          <div>
            <p className="font-display text-xl leading-none font-semibold tracking-wide">SalonOS</p>
            <p className="text-[11px] tracking-[0.2em] text-muted-foreground uppercase">
              Booking &amp; POS platform
            </p>
          </div>
        </div>
        <Link
          to="/auth"
          className="glass rounded-full px-4 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          Salon login
        </Link>
      </header>

      <main className="mx-auto max-w-5xl px-5 pb-24">
        <section className="glass mt-8 rounded-3xl p-7 sm:p-10">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-medium tracking-wider text-primary uppercase">
            <Sparkles className="size-3" /> One workspace per salon
          </span>
          <h1 className="mt-4 font-display text-4xl leading-tight font-semibold sm:text-6xl">
            Run your salon with <span className="gold-text">effortless luxury</span>
          </h1>
          <p className="mt-4 max-w-xl text-sm text-muted-foreground sm:text-base">
            Sign up and you instantly get your own private salon workspace — your services, your
            stylists, your bookings and your billing. Nothing is shared with anyone else.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              to="/auth"
              className="flex items-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground transition-transform active:scale-[0.98]"
            >
              Create your salon <ArrowRight className="size-4" />
            </Link>
            <Link
              to="/auth"
              className="glass rounded-full px-6 py-3.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              I already have an account
            </Link>
          </div>
        </section>

        <section className="mt-6 grid gap-3 sm:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="glass rounded-3xl p-5">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                <Icon className="size-4" />
              </div>
              <h2 className="mt-3 font-display text-lg font-semibold">{title}</h2>
              <p className="mt-1 text-xs text-muted-foreground">{body}</p>
            </div>
          ))}
        </section>

        <section className="glass mt-6 rounded-3xl p-6 sm:p-8">
          <h2 className="font-display text-2xl font-semibold">Booking with a salon?</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter the salon&apos;s booking handle to open their portal.
          </p>
          <form onSubmit={openSalon} className="mt-4 flex flex-wrap gap-3">
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="paragon-barber"
              className="min-w-0 flex-1 rounded-2xl bg-white/5 px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-primary/60"
            />
            <button
              type="submit"
              className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-transform active:scale-[0.98]"
            >
              Open portal
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
