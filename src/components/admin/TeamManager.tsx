import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Crown, Info, ShieldCheck, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getTeam, setAdminRole } from "@/lib/account.functions";

export default function TeamManager() {
  const load = useServerFn(getTeam);
  const setRole = useServerFn(setAdminRole);
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const { data: team = [], isPending } = useQuery({ queryKey: ["team"], queryFn: () => load() });

  async function change(target: string, admin: boolean) {
    setBusy(true);
    try {
      await setRole({ data: { email: target, admin } });
      toast.success(admin ? "Admin access granted" : "Admin access removed");
      setEmail("");
      qc.invalidateQueries({ queryKey: ["team"] });
      qc.invalidateQueries({ queryKey: ["access-requests"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update role");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-5">
      <div className="rounded-md border border-border bg-card p-4">
        <h2 className="font-display text-xl font-semibold">Admin & Staff Management</h2>
        <p className="mt-1 text-sm text-muted-foreground">Make a signed-up account an admin by entering their email.</p>
        <form
          className="mt-3 flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => { e.preventDefault(); if (email) change(email, true); }}
        >
          <Input type="email" required maxLength={255} placeholder="teammate@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button type="submit" disabled={busy}><UserPlus className="size-4" /> Make admin</Button>
        </form>
        <div className="mt-3 flex gap-2 rounded-md bg-secondary p-3 text-xs text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0 text-primary" />
          <p>How it works: your teammate first signs up on the sign-in page. Then enter their email here and tap “Make admin”. Admins get full access to bookings, billing, expenses, staff and the catalog, and can manage this team list. Staff approved from access requests get dashboard access without team controls.</p>
        </div>
      </div>

      <div className="space-y-2">
        {isPending && <p className="text-sm text-muted-foreground">Loading team…</p>}
        {team.map((m) => (
          <div key={m.userId} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-card p-3">
            <div className="flex min-w-0 items-center gap-2">
              {m.isOwner ? <Crown className="size-4 text-primary" /> : m.isAdmin ? <ShieldCheck className="size-4 text-primary" /> : null}
              <span className="break-all text-sm">{m.email}</span>
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary">
                {m.isOwner ? "Owner" : m.isAdmin ? "Admin" : "Staff"}
              </span>
            </div>
            {!m.isOwner && (
              <Button size="sm" variant={m.isAdmin ? "outline" : "default"} disabled={busy} onClick={() => change(m.email, !m.isAdmin)}>
                {m.isAdmin ? "Remove admin" : "Make admin"}
              </Button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
