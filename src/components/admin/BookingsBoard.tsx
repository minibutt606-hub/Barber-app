import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BadgeCheck,
  CalendarClock,
  CircleSlash,
  PlayCircle,
  Receipt,
  Radio,
  Check,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { formatDate, formatMoney, formatTime, todayISO } from "@/lib/salon";
import { cn } from "@/lib/utils";
import type { Appointment, Customer, PosDraft, Service, Staff } from "./types";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-warning/15 text-warning",
  confirmed: "bg-primary/15 text-primary",
  "in-service": "bg-chart-3/20 text-chart-3",
  completed: "bg-success/15 text-success",
  cancelled: "bg-destructive/15 text-destructive",
};

export default function BookingsBoard({ onConvert }: { onConvert: (draft: PosDraft) => void }) {
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["admin-board"],
    queryFn: async () => {
      const [appointments, customers, staff, services] = await Promise.all([
        supabase
          .from("appointments")
          .select("*")
          .gte("appointment_date", todayISO())
          .order("appointment_date")
          .order("start_time"),
        supabase.from("customers").select("*"),
        supabase.from("staff").select("*"),
        supabase.from("services").select("*"),
      ]);
      if (appointments.error) throw appointments.error;
      return {
        appointments: (appointments.data ?? []) as Appointment[],
        customers: (customers.data ?? []) as Customer[],
        staff: (staff.data ?? []) as Staff[],
        services: (services.data ?? []) as Service[],
      };
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("appointments").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-board"] });
      toast.success("Appointment updated");
    },
    onError: () => toast.error("Could not update the appointment"),
  });

  const appointments = data?.appointments ?? [];
  const customers = data?.customers ?? [];
  const staff = data?.staff ?? [];
  const services = data?.services ?? [];

  const lookupCustomer = (id: string | null) => customers.find((c) => c.id === id);
  const lookupStaff = (id: string | null) => staff.find((s) => s.id === id);
  const serviceNames = (ids: string[]) =>
    ids.map((id) => services.find((s) => s.id === id)?.name ?? "Service");

  const groups: { key: string; label: string }[] = [
    { key: "pending", label: "Awaiting approval" },
    { key: "confirmed", label: "Confirmed" },
    { key: "in-service", label: "In chair" },
    { key: "completed", label: "Completed" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-xs text-success">
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-70" />
          <span className="relative inline-flex size-2 rounded-full bg-success" />
        </span>
        <Radio className="size-3.5" /> Live — new bookings appear instantly
      </div>

      <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-4">
        {groups.map((group) => {
          const list = appointments.filter((a) => a.status === group.key);
          return (
            <section key={group.key} className="space-y-3">
              <header className="flex items-center justify-between px-1">
                <h3 className="font-display text-lg font-semibold">{group.label}</h3>
                <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-muted-foreground">
                  {list.length}
                </span>
              </header>
              {list.length === 0 && (
                <p className="glass rounded-3xl p-5 text-xs text-muted-foreground">
                  Nothing here yet.
                </p>
              )}
              {list.map((a) => {
                const customer = lookupCustomer(a.customer_id);
                const names = serviceNames(a.service_ids ?? []);
                return (
                  <article
                    key={a.id}
                    className="glass animate-in fade-in slide-in-from-bottom-2 space-y-3 rounded-3xl p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{customer?.name ?? "Walk-in guest"}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {customer?.phone ?? "—"}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-wide uppercase",
                          STATUS_STYLES[a.status],
                        )}
                      >
                        {a.status}
                      </span>
                    </div>

                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CalendarClock className="size-3.5 text-primary" />
                      {formatDate(a.appointment_date)} · {formatTime(String(a.start_time).slice(0, 5))}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {names.join(", ")} · {lookupStaff(a.staff_id)?.name ?? "Any stylist"}
                    </p>
                    {a.notes && <p className="text-xs text-primary/80 italic">“{a.notes}”</p>}

                    <div className="flex items-center justify-between border-t border-border pt-3">
                      <span className="text-[10px] tracking-wider text-muted-foreground">
                        {a.booking_code}
                      </span>
                      <span className="font-display text-lg font-semibold text-primary">
                        {formatMoney(a.total_amount)}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {a.status === "pending" && (
                        <ActionButton
                          icon={<BadgeCheck className="size-3.5" />}
                          label="Accept"
                          onClick={() => updateStatus.mutate({ id: a.id, status: "confirmed" })}
                        />
                      )}
                      {a.status === "confirmed" && (
                        <ActionButton
                          icon={<PlayCircle className="size-3.5" />}
                          label="Start"
                          onClick={() => updateStatus.mutate({ id: a.id, status: "in-service" })}
                        />
                      )}
                      {a.status === "in-service" && (
                        <ActionButton
                          icon={<Check className="size-3.5" />}
                          label="Complete"
                          tone="success"
                          onClick={() => updateStatus.mutate({ id: a.id, status: "completed" })}
                        />
                      )}
                      {a.status !== "completed" && a.status !== "cancelled" && (
                        <ActionButton
                          icon={<CircleSlash className="size-3.5" />}
                          label="Cancel"
                          tone="danger"
                          onClick={() => updateStatus.mutate({ id: a.id, status: "cancelled" })}
                        />
                      )}
                      <ActionButton
                        icon={<Receipt className="size-3.5" />}
                        label="Invoice"
                        tone="primary"
                        onClick={() =>
                          onConvert({
                            customerName: customer?.name ?? "",
                            customerPhone: customer?.phone ?? "",
                            staffId: a.staff_id,
                            appointmentId: a.id,
                            items: (a.service_ids ?? []).map((id) => {
                              const svc = services.find((s) => s.id === id);
                              return {
                                serviceId: id,
                                name: svc?.name ?? "Service",
                                price: Number(svc?.price ?? 0),
                                qty: 1,
                              };
                            }),
                          })
                        }
                      />
                    </div>
                  </article>
                );
              })}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  tone?: "default" | "primary" | "success" | "danger";
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all active:scale-95",
        tone === "primary" && "bg-primary/15 text-primary hover:bg-primary/25",
        tone === "success" && "bg-success/15 text-success hover:bg-success/25",
        tone === "danger" && "bg-destructive/12 text-destructive hover:bg-destructive/20",
        tone === "default" && "bg-white/5 text-foreground hover:bg-white/10",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
