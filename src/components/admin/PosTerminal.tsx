import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Minus, MessageCircle, Plus, Printer, Search, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { PAYMENT_METHODS, formatMoney, type PaymentMethod } from "@/lib/salon";
import { useMySalon } from "./useMySalon";
import { cn } from "@/lib/utils";
import type { Customer, PosDraft, PosLineItem, Service, Staff } from "./types";

export default function PosTerminal({
  draft,
  onDraftConsumed,
}: {
  draft: PosDraft | null;
  onDraftConsumed: () => void;
}) {
  const queryClient = useQueryClient();
  const [items, setItems] = useState<PosLineItem[]>([]);
  const [search, setSearch] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [staffId, setStaffId] = useState<string | null>(null);
  const [appointmentId, setAppointmentId] = useState<string | undefined>(undefined);
  const [discountMode, setDiscountMode] = useState<"pct" | "flat">("pct");
  const [discountValue, setDiscountValue] = useState(0);
  const [paidAmount, setPaidAmount] = useState<string>("");
  const [method, setMethod] = useState<PaymentMethod>("Cash");
  const [lastInvoiceNo, setLastInvoiceNo] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["pos-catalog"],
    queryFn: async () => {
      const [services, staff, customers] = await Promise.all([
        supabase.from("services").select("*").eq("is_active", true).order("name"),
        supabase.from("staff").select("*").eq("is_active", true).order("name"),
        supabase.from("customers").select("*"),
      ]);
      return {
        services: (services.data ?? []) as Service[],
        staff: (staff.data ?? []) as Staff[],
        customers: (customers.data ?? []) as Customer[],
      };
    },
  });

  const services = data?.services ?? [];
  const staff = data?.staff ?? [];
  const customers = data?.customers ?? [];

  useEffect(() => {
    if (!draft) return;
    setItems(draft.items);
    setCustomerName(draft.customerName);
    setCustomerPhone(draft.customerPhone);
    setStaffId(draft.staffId);
    setAppointmentId(draft.appointmentId);
    onDraftConsumed();
  }, [draft, onDraftConsumed]);

  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const discountAmount =
    discountMode === "pct"
      ? (subtotal * Math.min(Math.max(discountValue, 0), 100)) / 100
      : Math.min(Math.max(discountValue, 0), subtotal);
  const totalPayable = Math.max(subtotal - discountAmount, 0);
  const paid = paidAmount === "" ? totalPayable : Number(paidAmount);
  const due = Math.max(totalPayable - paid, 0);
  const discountPct = subtotal > 0 ? Number(((discountAmount / subtotal) * 100).toFixed(2)) : 0;

  const filtered = useMemo(
    () =>
      services.filter((s) =>
        `${s.name} ${s.category}`.toLowerCase().includes(search.trim().toLowerCase()),
      ),
    [services, search],
  );

  function addService(service: Service) {
    setItems((prev) => {
      const found = prev.find((i) => i.serviceId === service.id);
      if (found) {
        return prev.map((i) => (i.serviceId === service.id ? { ...i, qty: i.qty + 1 } : i));
      }
      return [
        ...prev,
        { serviceId: service.id, name: service.name, price: Number(service.price), qty: 1 },
      ];
    });
  }

  function changeQty(serviceId: string | null, delta: number) {
    setItems((prev) =>
      prev
        .map((i) => (i.serviceId === serviceId ? { ...i, qty: i.qty + delta } : i))
        .filter((i) => i.qty > 0),
    );
  }

  function resetSale() {
    setItems([]);
    setCustomerName("");
    setCustomerPhone("");
    setStaffId(null);
    setAppointmentId(undefined);
    setDiscountValue(0);
    setPaidAmount("");
    setMethod("Cash");
  }

  const phoneMatch = customers.find(
    (c) => c.phone.replace(/\D/g, "") === customerPhone.replace(/\D/g, ""),
  );

  const settle = useMutation({
    mutationFn: async () => {
      if (items.length === 0) throw new Error("Add at least one service");
      const phone = customerPhone.replace(/[^\d+]/g, "");
      let customerId: string | null = null;

      if (phone) {
        const { data: existing } = await supabase
          .from("customers")
          .select("*")
          .eq("phone", phone)
          .maybeSingle();
        if (existing) {
          customerId = existing.id;
          await supabase
            .from("customers")
            .update({
              name: customerName || existing.name,
              total_visits: existing.total_visits + 1,
              total_spent: Number(existing.total_spent) + paid,
            })
            .eq("id", existing.id);
        } else {
          const { data: created, error } = await supabase
            .from("customers")
            .insert({
              name: customerName || "Walk-in guest",
              phone,
              total_visits: 1,
              total_spent: paid,
            })
            .select("id")
            .single();
          if (error) throw error;
          customerId = created.id;
        }
      }

      const invoiceNo = `INV-${Date.now().toString().slice(-8)}`;
      const { error: invError } = await supabase.from("invoices").insert({
        invoice_no: invoiceNo,
        customer_id: customerId,
        staff_id: staffId,
        items: items.map((i) => ({ name: i.name, price: i.price, qty: i.qty })),
        subtotal,
        discount_pct: discountPct,
        total_amount: totalPayable,
        paid_amount: paid,
        due_amount: due,
        payment_method: method,
      });
      if (invError) throw invError;

      if (appointmentId) {
        await supabase.from("appointments").update({ status: "completed" }).eq("id", appointmentId);
      }
      return invoiceNo;
    },
    onSuccess: (invoiceNo) => {
      setLastInvoiceNo(invoiceNo);
      queryClient.invalidateQueries({ queryKey: ["admin-financials"] });
      queryClient.invalidateQueries({ queryKey: ["admin-board"] });
      queryClient.invalidateQueries({ queryKey: ["pos-catalog"] });
      toast.success(`Invoice ${invoiceNo} settled`);
      setTimeout(() => window.print(), 150);
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not settle the invoice"),
  });

  const salon = useMySalon();
  const staffName = staff.find((s) => s.id === staffId)?.name ?? null;

  const receiptText = () =>
    [
      `*${salon.name}* — Invoice`,
      `*Invoice:* ${lastInvoiceNo ?? "DRAFT"}`,
      `*Date:* ${new Date().toLocaleString("en-GB")}`,
      customerName ? `*Guest:* ${customerName}` : "",
      customerPhone ? `*Phone:* ${customerPhone}` : "",
      staffName ? `*Stylist:* ${staffName}` : "",
      "",
      "*Services*",
      ...items.map((i) => `• ${i.qty} × ${i.name} — ${formatMoney(i.price * i.qty)}`),
      "",
      `*Subtotal:* ${formatMoney(subtotal)}`,
      discountAmount ? `*Discount:* -${formatMoney(discountAmount)}` : "",
      `*Total:* ${formatMoney(totalPayable)}`,
      `*Paid (${method}):* ${formatMoney(paid)}`,
      due ? `*Balance due:* ${formatMoney(due)}` : "",
      "",
      `${salon.address}`,
      "Thank you for visiting!",
    ]
      .filter(Boolean)
      .join("\n");

  function sendWhatsappReceipt() {
    if (items.length === 0) {
      toast.error("Add at least one service first");
      return;
    }
    const digits = customerPhone.replace(/\D/g, "");
    let target: string = salon.whatsapp;
    if (digits.length >= 10) {
      target = digits.startsWith("0")
        ? `92${digits.slice(1)}`
        : digits.startsWith("92")
          ? digits
          : digits;
    }
    const url = `https://wa.me/${target}?text=${encodeURIComponent(receiptText())}`;
    const win = window.open(url, "_blank", "noopener,noreferrer");
    if (!win) window.location.href = url;
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
      {/* Catalog */}
      <section className="glass rounded-3xl p-5">
        <div className="flex items-center gap-2 rounded-2xl bg-white/5 px-4">
          <Search className="size-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search services…"
            className="w-full bg-transparent py-3 text-sm outline-none"
          />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s) => (
            <button
              key={s.id}
              onClick={() => addService(s)}
              className="rounded-2xl bg-white/[0.04] p-4 text-left transition-all hover:bg-white/[0.08] active:scale-[0.98]"
            >
              <p className="text-[10px] tracking-wider text-muted-foreground uppercase">
                {s.category}
              </p>
              <p className="mt-1 text-sm font-medium">{s.name}</p>
              <p className="mt-2 font-display text-lg font-semibold text-primary">
                {formatMoney(s.price)}
              </p>
            </button>
          ))}
        </div>
      </section>

      {/* Ticket */}
      <section className="glass-strong space-y-4 rounded-3xl p-5">
        <h3 className="font-display text-xl font-semibold">Current sale</h3>

        <div className="space-y-2">
          <div className="flex items-center gap-2 rounded-2xl bg-white/5 px-4">
            <UserPlus className="size-4 text-muted-foreground" />
            <input
              value={customerPhone}
              onChange={(e) => {
                setCustomerPhone(e.target.value);
                const match = customers.find(
                  (c) => c.phone.replace(/\D/g, "") === e.target.value.replace(/\D/g, ""),
                );
                if (match) setCustomerName(match.name);
              }}
              placeholder="Customer phone"
              className="w-full bg-transparent py-2.5 text-sm outline-none"
            />
          </div>
          <input
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Customer name"
            className="w-full rounded-2xl bg-white/5 px-4 py-2.5 text-sm outline-none"
          />
          {phoneMatch && (
            <p className="text-[11px] text-success">
              Returning guest · {phoneMatch.total_visits} visits ·{" "}
              {formatMoney(phoneMatch.total_spent)} lifetime
            </p>
          )}
          <select
            value={staffId ?? ""}
            onChange={(e) => setStaffId(e.target.value || null)}
            className="w-full rounded-2xl bg-white/5 px-4 py-2.5 text-sm outline-none"
          >
            <option value="">Assign stylist</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id} className="bg-card">
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          {items.length === 0 && (
            <p className="rounded-2xl bg-white/[0.03] p-4 text-xs text-muted-foreground">
              Tap a service to start the ticket.
            </p>
          )}
          {items.map((i) => (
            <div key={i.serviceId ?? i.name} className="flex items-center gap-2 rounded-2xl bg-white/[0.04] p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{i.name}</p>
                <p className="text-xs text-muted-foreground">{formatMoney(i.price)} each</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => changeQty(i.serviceId, -1)}
                  className="flex size-7 items-center justify-center rounded-full bg-white/5"
                >
                  <Minus className="size-3" />
                </button>
                <span className="w-6 text-center text-sm">{i.qty}</span>
                <button
                  onClick={() => changeQty(i.serviceId, 1)}
                  className="flex size-7 items-center justify-center rounded-full bg-white/5"
                >
                  <Plus className="size-3" />
                </button>
              </div>
              <p className="w-20 text-right text-sm font-medium">{formatMoney(i.price * i.qty)}</p>
            </div>
          ))}
        </div>

        <div className="space-y-3 border-t border-border pt-4 text-sm">
          <Row label="Subtotal" value={formatMoney(subtotal)} />
          <div className="flex items-center gap-2">
            <div className="flex rounded-full bg-white/5 p-0.5">
              {(["pct", "flat"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setDiscountMode(m)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs",
                    discountMode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                  )}
                >
                  {m === "pct" ? "%" : "Flat"}
                </button>
              ))}
            </div>
            <input
              type="number"
              min={0}
              value={discountValue || ""}
              onChange={(e) => setDiscountValue(Number(e.target.value))}
              placeholder="Discount"
              className="w-full rounded-2xl bg-white/5 px-4 py-2 text-sm outline-none"
            />
            <span className="w-20 text-right text-destructive">-{formatMoney(discountAmount)}</span>
          </div>
          <Row
            label="Total payable"
            value={formatMoney(totalPayable)}
            className="text-base font-semibold text-primary"
          />
          <div className="flex items-center gap-2">
            <span className="flex-1 text-muted-foreground">Paid</span>
            <input
              type="number"
              min={0}
              value={paidAmount}
              onChange={(e) => setPaidAmount(e.target.value)}
              placeholder={String(totalPayable)}
              className="w-32 rounded-2xl bg-white/5 px-4 py-2 text-right text-sm outline-none"
            />
          </div>
          <Row
            label="Balance due"
            value={formatMoney(due)}
            className={due > 0 ? "text-destructive" : "text-success"}
          />
        </div>

        <div className="grid grid-cols-4 gap-2">
          {PAYMENT_METHODS.map((m) => (
            <button
              key={m}
              onClick={() => setMethod(m)}
              className={cn(
                "rounded-2xl py-2 text-xs font-medium transition-all",
                method === m ? "bg-primary text-primary-foreground" : "bg-white/5 text-muted-foreground",
              )}
            >
              {m}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            disabled={settle.isPending || items.length === 0}
            onClick={() => settle.mutate()}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {settle.isPending ? <Loader2 className="size-4 animate-spin" /> : <Printer className="size-4" />}
            Print &amp; Settle
          </button>
          <button
            type="button"
            onClick={sendWhatsappReceipt}
            aria-label="Send receipt on WhatsApp"
            className="flex items-center justify-center gap-2 rounded-full bg-success/15 px-4 py-3 text-sm font-semibold text-success"
          >
            <MessageCircle className="size-4" />
          </button>
          <button
            onClick={resetSale}
            className="flex items-center justify-center rounded-full bg-white/5 px-4 py-3 text-muted-foreground"
            aria-label="Clear sale"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </section>

      {/* Thermal receipt (print only) */}
      <div id="thermal-receipt" className="hidden print:block">
        <div style={{ textAlign: "center" }}>
          <strong>{salon.name}</strong>
          <div>{salon.address}</div>
          <div>{salon.phone}</div>
          <div>--------------------------------</div>
        </div>
        <div>Invoice: {lastInvoiceNo ?? "DRAFT"}</div>
        <div>Date: {new Date().toLocaleString("en-GB")}</div>
        {customerName && <div>Guest: {customerName}</div>}
        {customerPhone && <div>Phone: {customerPhone}</div>}
        <div>--------------------------------</div>
        {items.map((i) => (
          <div key={i.name} style={{ display: "flex", justifyContent: "space-between" }}>
            <span>
              {i.qty} x {i.name}
            </span>
            <span>{formatMoney(i.price * i.qty)}</span>
          </div>
        ))}
        <div>--------------------------------</div>
        <ReceiptRow label="Subtotal" value={formatMoney(subtotal)} />
        <ReceiptRow label="Discount" value={`-${formatMoney(discountAmount)}`} />
        <ReceiptRow label="TOTAL" value={formatMoney(totalPayable)} />
        <ReceiptRow label={`Paid (${method})`} value={formatMoney(paid)} />
        <ReceiptRow label="Balance" value={formatMoney(due)} />
        <div>--------------------------------</div>
        <div style={{ textAlign: "center" }}>Thank you for visiting!</div>
      </div>
    </div>
  );
}

function Row({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}

function ReceiptRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
