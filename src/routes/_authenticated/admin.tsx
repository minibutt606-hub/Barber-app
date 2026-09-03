import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  CalendarRange,
  LayoutGrid,
  LogOut,
  Scissors,
  ShoppingBag,
  Bell,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { SALON } from "@/lib/salon";
import { cn } from "@/lib/utils";
import BookingsBoard from "@/components/admin/BookingsBoard";
import PosTerminal from "@/components/admin/PosTerminal";
import Financials from "@/components/admin/Financials";
import CatalogManager from "@/components/admin/CatalogManager";
import type { PosDraft } from "@/components/admin/types";
import { useBookingAlerts } from "@/components/admin/useBookingAlerts";
import { formatDate, formatMoney, formatTime } from "@/lib/salon";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Salon Command Centre — Paragon Barber" },
      {
        name: "description",
        content:
          "Live bookings board, point of sale with thermal receipts, financial analytics and catalog management for Paragon Barber.",
      },
      { property: "og:title", content: "Salon Command Centre — Paragon Barber" },
      {
        property: "og:description",
        content: "Manage bookings, billing and analytics for Paragon Barber.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminDashboard,
});

const TABS = [
  { key: "bookings", label: "Bookings", icon: CalendarRange },
  { key: "pos", label: "Point of Sale", icon: ShoppingBag },
  { key: "financials", label: "Financials", icon: BarChart3 },
  { key: "catalog", label: "Catalog", icon: Scissors },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function AdminDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabKey>("bookings");
  const [draft, setDraft] = useState<PosDraft | null>(null);
  const [showAlerts, setShowAlerts] = useState(false);
  const { alerts, unread, clearUnread } = useBookingAlerts();

  function openBookings() {
    setTab("bookings");
    setShowAlerts(false);
    clearUnread();
  }

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background pb-24 lg:pb-0">
      <div className="pointer-events-none fixed inset-x-0 top-0 h-96 bg-[radial-gradient(60%_60%_at_50%_0%,color-mix(in_oklch,var(--color-primary)_16%,transparent),transparent)] print:hidden" />

      <div className="relative mx-auto flex max-w-[1500px] gap-6 px-4 py-6 lg:px-8">
        {/* Desktop rail */}
        <aside className="glass sticky top-6 hidden h-fit w-60 shrink-0 rounded-3xl p-4 lg:block print:hidden">
          <div className="flex items-center gap-2 px-2 py-3">
            <LayoutGrid className="size-4 text-primary" />
            <div>
              <p className="font-display text-lg leading-tight font-semibold">{SALON.name}</p>
              <p className="text-[11px] text-muted-foreground">Command centre</p>
            </div>
          </div>
          <nav className="mt-4 space-y-1">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => { setTab(key); if (key === "bookings") clearUnread(); }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm transition-all",
                  tab === key
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:bg-white/5",
                )}
              >
                <Icon className="size-4" />
                {label}
                {key === "bookings" && unread > 0 && (
                  <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                    {unread}
                  </span>
                )}
              </button>
            ))}
          </nav>
          <button
            onClick={signOut}
            className="mt-6 flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm text-muted-foreground hover:bg-white/5"
          >
            <LogOut className="size-4" /> Sign out
          </button>
        </aside>

        <main className="min-w-0 flex-1 space-y-6">
          <header className="flex items-center justify-between print:hidden">
            <div>
              <h1 className="font-display text-3xl font-semibold">
                {TABS.find((t) => t.key === tab)?.label}
              </h1>
              <p className="text-sm text-muted-foreground">{SALON.tagline}</p>
            </div>
            <div className="relative flex items-center gap-2">
              <button
                onClick={() => {
                  setShowAlerts((v) => !v);
                  clearUnread();
                }}
                className="glass relative flex size-10 items-center justify-center rounded-full text-muted-foreground"
                aria-label="Booking notifications"
              >
                <Bell className="size-4" />
                {unread > 0 && (
                  <span className="absolute -top-1 -right-1 flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                    {unread}
                  </span>
                )}
              </button>
              <button
                onClick={signOut}
                className="glass flex size-10 items-center justify-center rounded-full text-muted-foreground lg:hidden"
                aria-label="Sign out"
              >
                <LogOut className="size-4" />
              </button>

              {showAlerts && (
                <div className="glass-strong absolute top-12 right-0 z-50 w-72 space-y-2 rounded-3xl p-4">
                  <p className="text-xs tracking-wider text-muted-foreground uppercase">
                    New bookings
                  </p>
                  {alerts.length === 0 && (
                    <p className="text-xs text-muted-foreground">No new bookings yet.</p>
                  )}
                  {alerts.map((a) => (
                    <button
                      key={a.id}
                      onClick={openBookings}
                      className="w-full rounded-2xl bg-white/5 px-3 py-2 text-left"
                    >
                      <p className="text-xs font-semibold text-primary">{a.code}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {formatDate(a.date)} · {formatTime(a.time)} · {formatMoney(a.amount)}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </header>

          {tab === "bookings" && (
            <BookingsBoard
              onConvert={(d) => {
                setDraft(d);
                setTab("pos");
              }}
            />
          )}
          {tab === "pos" && <PosTerminal draft={draft} onDraftConsumed={() => setDraft(null)} />}
          {tab === "financials" && <Financials />}
          {tab === "catalog" && <CatalogManager />}
        </main>
      </div>

      {/* Mobile tab bar — fixed height, never grows */}
      <nav className="glass-strong fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around px-2 py-0 lg:hidden print:hidden">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => { setTab(key); if (key === "bookings") clearUnread(); }}
            className={cn(
              "flex h-full flex-1 flex-col items-center justify-center gap-1 rounded-2xl text-[10px] leading-none transition-all",
              tab === key ? "bg-primary/15 text-primary" : "text-muted-foreground",
            )}
          >
            <span className="relative">
              <Icon className="size-4 shrink-0" />
              {key === "bookings" && unread > 0 && (
                <span className="absolute -top-1.5 -right-2 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                  {unread}
                </span>
              )}
            </span>
            <span className="whitespace-nowrap">{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
