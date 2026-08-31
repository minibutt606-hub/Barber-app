import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDownRight, ArrowUpRight, Crown, Plus, Wallet } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { EXPENSE_CATEGORIES, formatMoney, todayISO } from "@/lib/salon";
import { cn } from "@/lib/utils";
import type { Customer, Expense, Invoice, Staff } from "./types";

type Range = 7 | 30 | 90;

function daysAgoISO(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export default function Financials() {
  const queryClient = useQueryClient();
  const [range, setRange] = useState<Range>(30);
  const [form, setForm] = useState({
    title: "",
    amount: "",
    category: EXPENSE_CATEGORIES[0] as string,
  });

  const { data } = useQuery({
    queryKey: ["admin-financials"],
    queryFn: async () => {
      const [invoices, expenses, staff, customers] = await Promise.all([
        supabase.from("invoices").select("*").order("created_at", { ascending: false }),
        supabase.from("expenses").select("*").order("expense_date", { ascending: false }),
        supabase.from("staff").select("*"),
        supabase.from("customers").select("*").order("total_spent", { ascending: false }),
      ]);
      return {
        invoices: (invoices.data ?? []) as Invoice[],
        expenses: (expenses.data ?? []) as Expense[],
        staff: (staff.data ?? []) as Staff[],
        customers: (customers.data ?? []) as Customer[],
      };
    },
  });

  const invoices = data?.invoices ?? [];
  const expenses = data?.expenses ?? [];
  const staff = data?.staff ?? [];
  const customers = data?.customers ?? [];

  const since = daysAgoISO(range);
  const rangeInvoices = invoices.filter((i) => String(i.created_at).slice(0, 10) >= since);
  const rangeExpenses = expenses.filter((e) => String(e.expense_date) >= since);

  const revenue = rangeInvoices.reduce((s, i) => s + Number(i.paid_amount), 0);
  const spend = rangeExpenses.reduce((s, e) => s + Number(e.amount), 0);
  const profit = revenue - spend;
  const avgTicket = rangeInvoices.length ? revenue / rangeInvoices.length : 0;

  const daily = useMemo(() => {
    const map = new Map<string, number>();
    for (let i = range - 1; i >= 0; i--) map.set(daysAgoISO(i), 0);
    rangeInvoices.forEach((inv) => {
      const key = String(inv.created_at).slice(0, 10);
      if (map.has(key)) map.set(key, (map.get(key) ?? 0) + Number(inv.paid_amount));
    });
    return [...map.entries()].map(([date, total]) => ({ date, total }));
  }, [rangeInvoices, range]);

  const maxDaily = Math.max(...daily.map((d) => d.total), 1);

  const byStaff = staff
    .map((s) => ({
      name: s.name,
      total: rangeInvoices
        .filter((i) => i.staff_id === s.id)
        .reduce((sum, i) => sum + Number(i.paid_amount), 0),
    }))
    .sort((a, b) => b.total - a.total);
  const maxStaff = Math.max(...byStaff.map((s) => s.total), 1);

  const addExpense = useMutation({
    mutationFn: async () => {
      if (!form.title.trim() || !Number(form.amount)) throw new Error("Add a title and amount");
      const { error } = await supabase.from("expenses").insert({
        title: form.title.trim(),
        amount: Number(form.amount),
        category: form.category,
        expense_date: todayISO(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setForm({ title: "", amount: "", category: EXPENSE_CATEGORIES[0] });
      queryClient.invalidateQueries({ queryKey: ["admin-financials"] });
      toast.success("Expense recorded");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save expense"),
  });

  return (
    <div className="w-full max-w-full space-y-6 overflow-x-hidden">
      <div className="flex flex-wrap items-center gap-2">
        {([7, 30, 90] as Range[]).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={cn(
              "rounded-full px-3 py-2 text-[11px] font-medium whitespace-nowrap transition-all sm:px-4 sm:text-xs",
              range === r ? "bg-primary text-primary-foreground" : "glass text-muted-foreground",
            )}
          >
            Last {r} days
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Stat label="Revenue" value={formatMoney(revenue)} icon={<ArrowUpRight className="size-4" />} tone="success" />
        <Stat label="Expenses" value={formatMoney(spend)} icon={<ArrowDownRight className="size-4" />} tone="danger" />
        <Stat label="Net profit" value={formatMoney(profit)} icon={<Wallet className="size-4" />} tone="primary" />
        <Stat label="Avg. ticket" value={formatMoney(avgTicket)} icon={<Crown className="size-4" />} tone="primary" />
      </div>

      <section className="glass rounded-3xl p-4 sm:p-5">
        <h3 className="font-display text-lg font-semibold sm:text-xl">Daily revenue</h3>
        {rangeInvoices.length === 0 ? (
          <p className="mt-4 rounded-2xl bg-white/[0.03] p-5 text-xs text-muted-foreground">
            No sales recorded yet.
          </p>
        ) : (
          <div className="no-scrollbar -mx-1 mt-5 overflow-x-auto px-1">
            <div className="flex h-40 min-w-full items-end gap-1 sm:h-44" style={{ minWidth: daily.length * 8 }}>
              {daily.map((d) => (
                <div key={d.date} className="group flex h-full min-w-[6px] flex-1 flex-col items-center justify-end gap-1">
                  <span className="text-[9px] text-primary opacity-0 transition-opacity group-hover:opacity-100">
                    {Math.round(d.total / 1000)}k
                  </span>
                  <div
                    className="w-full rounded-t-md bg-gradient-to-t from-primary/25 to-primary transition-all"
                    style={{ height: `${Math.max((d.total / maxDaily) * 100, 2)}%` }}
                    title={`${d.date}: ${formatMoney(d.total)}`}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="glass rounded-3xl p-4 sm:p-5">
          <h3 className="font-display text-lg font-semibold sm:text-xl">Stylist performance</h3>
          <div className="mt-4 space-y-3">
            {byStaff.length === 0 && (
              <p className="rounded-2xl bg-white/[0.03] p-5 text-xs text-muted-foreground">
                No staff members added.
              </p>
            )}
            {byStaff.map((s) => (
              <div key={s.name} className="space-y-1.5">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate">{s.name}</span>
                  <span className="shrink-0 text-primary">{formatMoney(s.total)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${(s.total / maxStaff) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="glass rounded-3xl p-4 sm:p-5">
          <h3 className="font-display text-lg font-semibold sm:text-xl">Top guests</h3>
          <div className="mt-4 space-y-3">
            {customers.length === 0 && (
              <p className="rounded-2xl bg-white/[0.03] p-5 text-xs text-muted-foreground">
                No guests recorded yet.
              </p>
            )}
            {customers.slice(0, 6).map((c, idx) => (
              <div key={c.id} className="flex items-center gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/12 text-xs text-primary">
                  {idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.total_visits} visits</p>
                </div>
                <span className="shrink-0 text-sm text-primary">{formatMoney(c.total_spent)}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="glass rounded-3xl p-4 sm:p-5">
        <h3 className="font-display text-lg font-semibold sm:text-xl">Expenses</h3>
        <div className="mt-4 grid gap-2 sm:grid-cols-[1.4fr_1fr_1fr_auto]">
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Expense title"
            className="w-full min-w-0 rounded-2xl bg-white/5 px-4 py-2.5 text-sm outline-none"
          />
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="w-full min-w-0 rounded-2xl bg-white/5 px-4 py-2.5 text-sm outline-none"
          >
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c} className="bg-card">
                {c}
              </option>
            ))}
          </select>
          <input
            type="number"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            placeholder="Amount"
            className="w-full min-w-0 rounded-2xl bg-white/5 px-4 py-2.5 text-sm outline-none"
          />
          <button
            onClick={() => addExpense.mutate()}
            className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            <Plus className="size-4" /> Add
          </button>
        </div>
        <div className="mt-4 space-y-2">
          {rangeExpenses.length === 0 && (
            <p className="rounded-2xl bg-white/[0.03] p-5 text-xs text-muted-foreground">
              No expenses recorded yet.
            </p>
          )}
          {rangeExpenses.slice(0, 10).map((e) => (
            <div
              key={e.id}
              className="flex items-center justify-between gap-3 rounded-2xl bg-white/[0.04] px-4 py-3 text-sm"
            >
              <div className="min-w-0">
                <p className="truncate">{e.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {e.category} · {e.expense_date}
                </p>
              </div>
              <span className="shrink-0 text-destructive">-{formatMoney(e.amount)}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}


function Stat({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone: "success" | "danger" | "primary";
}) {
  return (
    <div className="glass rounded-3xl p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs tracking-wider text-muted-foreground uppercase">{label}</p>
        <span
          className={cn(
            "flex size-8 items-center justify-center rounded-full",
            tone === "success" && "bg-success/15 text-success",
            tone === "danger" && "bg-destructive/12 text-destructive",
            tone === "primary" && "bg-primary/15 text-primary",
          )}
        >
          {icon}
        </span>
      </div>
      <p className="mt-3 font-display text-2xl font-semibold">{value}</p>
    </div>
  );
}
