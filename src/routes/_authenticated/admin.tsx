import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getAccess, getAccessRequests, reviewAccess } from "@/lib/account.functions";
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
import { useMySalon } from "@/components/admin/useMySalon";
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
       { title: "Management Dashboard — Paragon Salon" },
      {
        name: "description",
        content:
           "Live bookings, point of sale, financials and catalog management for Paragon Salon.",
      },
       { property: "og:title", content: "Management Dashboard — Paragon Salon" },
      {
        property: "og:description",
         content: "Manage bookings, billing and analytics for Paragon Salon.",
      },
       { property: "og:type", content: "website" },
       { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminAccessGate,
});

function AdminAccessGate() {
  const accessFn = useServerFn(getAccess);
  const navigate = useNavigate();
  const { data, isPending } = useQuery({ queryKey: ["paragon-access"], queryFn: () => accessFn() });
  if (isPending) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading management access…</div>;
  if (!data?.allowed) return <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-5 text-center">
    <h1 className="font-display text-3xl font-semibold">Management access pending</h1>
    <p className="text-sm text-muted-foreground">Only approved Paragon Salon staff can open this page.</p>
    <Button variant="outline" onClick={() => navigate({ to: "/auth", replace: true })}>Back to sign in</Button>
  </div>;
  return <AdminDashboard isOwner={data.owner} />;
}

function AccessRequests() {
  const load = useServerFn(getAccessRequests);
  const review = useServerFn(reviewAccess);
  const queryClient = useQueryClient();
  const { data: requests = [] } = useQuery({ queryKey: ["access-requests"], queryFn: () => load() });
  if (requests.length === 0) return null;
  return <section className="border-b border-border pb-5">
    <h2 className="font-display text-xl font-semibold">Staff access requests</h2>
    <div className="mt-3 space-y-2">{requests.map((request) => <div key={request.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-card p-3">
      <span className="min-w-0 break-all text-sm">{request.email}</span>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={async () => { try { await review({ data: { id: request.id, decision: "rejected" } }); queryClient.invalidateQueries({ queryKey: ["access-requests"] }); } catch { toast.error("Could not reject request"); } }}>Decline</Button>
        <Button size="sm" onClick={async () => { try { await review({ data: { id: request.id, decision: "approved" } }); queryClient.invalidateQueries({ queryKey: ["access-requests"] }); toast.success("Staff access granted"); } catch { toast.error("Could not approve request"); } }}>Approve</Button>
      </div>
    </div>)}</div>
  </section>;
}

const TABS = [
  { key: "bookings", label: "Bookings", icon: CalendarRange },
  { key: "pos", label: "Point of Sale", icon: ShoppingBag },
  { key: "financials", label: "Financials", icon: BarChart3 },
  { key: "catalog", label: "Catalog", icon: Scissors },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function AdminDashboard({ isOwner }: { isOwner: boolean }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabKey>("bookings");
  const [draft, setDraft] = useState<PosDraft | null>(null);
  const [showAlerts, setShowAlerts] = useState(false);
  const { alerts, unread, clearUnread } = useBookingAlerts();
  const salon = useMySalon();

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
      <div className="relative mx-auto flex max-w-[1500px] gap-6 px-4 py-6 lg:px-8">
        {/* Desktop rail */}
        <aside className="glass sticky top-6 hidden h-fit w-60 shrink-0 rounded-3xl p-4 lg:block print:hidden">
          <div className="flex items-center gap-2 px-2 py-3">
            <LayoutGrid className="size-4 text-primary" />
            <div>
              <p className="font-display text-lg leading-tight font-semibold">{salon.name}</p>
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
                    : "text-muted-foreground hover:bg-secondary",
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
            className="mt-6 flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm text-muted-foreground hover:bg-secondary"
          >
            <LogOut className="size-4" /> Sign out
          </button>

          <div className="mt-4 rounded-md bg-secondary p-3">
              <p className="text-[10px] tracking-wider text-muted-foreground uppercase">
                Your booking link
              </p>
              <a
                href="/book"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 block truncate text-xs text-primary"
              >
                /book
              </a>
            </div>
        </aside>

        <main className="min-w-0 flex-1 space-y-6">
          {isOwner && <AccessRequests />}
          <header className="flex items-center justify-between print:hidden">
            <div>
              <h1 className="font-display text-3xl font-semibold">
                {TABS.find((t) => t.key === tab)?.label}
              </h1>
              <p className="text-sm text-muted-foreground">{salon.tagline}</p>
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
                      className="w-full rounded-2xl bg-secondary px-3 py-2 text-left"
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
