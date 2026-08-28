import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Power, Scissors, UserRound } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { SERVICE_CATEGORIES, formatDuration, formatMoney } from "@/lib/salon";
import { cn } from "@/lib/utils";
import type { Service, Staff } from "./types";

export default function CatalogManager() {
  const queryClient = useQueryClient();
  const [serviceForm, setServiceForm] = useState({
    name: "",
    category: SERVICE_CATEGORIES[0] as string,
    price: "",
    duration: "30",
  });
  const [staffForm, setStaffForm] = useState({ name: "", role: "", specialties: "" });

  const { data } = useQuery({
    queryKey: ["admin-catalog"],
    queryFn: async () => {
      const [services, staff] = await Promise.all([
        supabase.from("services").select("*").order("category").order("name"),
        supabase.from("staff").select("*").order("name"),
      ]);
      return {
        services: (services.data ?? []) as Service[],
        staff: (staff.data ?? []) as Staff[],
      };
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-catalog"] });
    queryClient.invalidateQueries({ queryKey: ["pos-catalog"] });
  };

  const addService = useMutation({
    mutationFn: async () => {
      if (!serviceForm.name.trim() || !Number(serviceForm.price))
        throw new Error("Add a service name and price");
      const { error } = await supabase.from("services").insert({
        name: serviceForm.name.trim(),
        category: serviceForm.category,
        price: Number(serviceForm.price),
        duration_minutes: Number(serviceForm.duration) || 30,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setServiceForm({ name: "", category: SERVICE_CATEGORIES[0], price: "", duration: "30" });
      invalidate();
      toast.success("Service added");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not add service"),
  });

  const toggleService = useMutation({
    mutationFn: async (s: Service) => {
      const { error } = await supabase
        .from("services")
        .update({ is_active: !s.is_active })
        .eq("id", s.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const addStaff = useMutation({
    mutationFn: async () => {
      if (!staffForm.name.trim()) throw new Error("Add a stylist name");
      const { error } = await supabase.from("staff").insert({
        name: staffForm.name.trim(),
        role: staffForm.role.trim() || "Stylist",
        specialties: staffForm.specialties
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setStaffForm({ name: "", role: "", specialties: "" });
      invalidate();
      toast.success("Stylist added");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not add stylist"),
  });

  const toggleStaff = useMutation({
    mutationFn: async (s: Staff) => {
      const { error } = await supabase.from("staff").update({ is_active: !s.is_active }).eq("id", s.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const services = data?.services ?? [];
  const staff = data?.staff ?? [];

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <section className="glass space-y-4 rounded-3xl p-5">
        <h3 className="flex items-center gap-2 font-display text-xl font-semibold">
          <Scissors className="size-4 text-primary" /> Services
        </h3>
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            value={serviceForm.name}
            onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
            placeholder="Service name"
            className="rounded-2xl bg-white/5 px-4 py-2.5 text-sm outline-none"
          />
          <select
            value={serviceForm.category}
            onChange={(e) => setServiceForm({ ...serviceForm, category: e.target.value })}
            className="rounded-2xl bg-white/5 px-4 py-2.5 text-sm outline-none"
          >
            {SERVICE_CATEGORIES.map((c) => (
              <option key={c} value={c} className="bg-card">
                {c}
              </option>
            ))}
          </select>
          <input
            type="number"
            value={serviceForm.price}
            onChange={(e) => setServiceForm({ ...serviceForm, price: e.target.value })}
            placeholder="Price"
            className="rounded-2xl bg-white/5 px-4 py-2.5 text-sm outline-none"
          />
          <input
            type="number"
            value={serviceForm.duration}
            onChange={(e) => setServiceForm({ ...serviceForm, duration: e.target.value })}
            placeholder="Minutes"
            className="rounded-2xl bg-white/5 px-4 py-2.5 text-sm outline-none"
          />
        </div>
        <button
          onClick={() => addService.mutate()}
          className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          <Plus className="size-4" /> Add service
        </button>

        <div className="space-y-2">
          {services.map((s) => (
            <div
              key={s.id}
              className={cn(
                "flex items-center gap-3 rounded-2xl bg-white/[0.04] px-4 py-3",
                !s.is_active && "opacity-45",
              )}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{s.name}</p>
                <p className="text-xs text-muted-foreground">
                  {s.category} · {formatDuration(s.duration_minutes)}
                </p>
              </div>
              <span className="text-sm text-primary">{formatMoney(s.price)}</span>
              <button
                onClick={() => toggleService.mutate(s)}
                className={cn(
                  "flex size-8 items-center justify-center rounded-full",
                  s.is_active ? "bg-success/15 text-success" : "bg-white/5 text-muted-foreground",
                )}
                aria-label="Toggle service"
              >
                <Power className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="glass space-y-4 rounded-3xl p-5">
        <h3 className="flex items-center gap-2 font-display text-xl font-semibold">
          <UserRound className="size-4 text-primary" /> Stylists
        </h3>
        <div className="grid gap-2">
          <input
            value={staffForm.name}
            onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
            placeholder="Stylist name"
            className="rounded-2xl bg-white/5 px-4 py-2.5 text-sm outline-none"
          />
          <input
            value={staffForm.role}
            onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })}
            placeholder="Role (e.g. Master Barber)"
            className="rounded-2xl bg-white/5 px-4 py-2.5 text-sm outline-none"
          />
          <input
            value={staffForm.specialties}
            onChange={(e) => setStaffForm({ ...staffForm, specialties: e.target.value })}
            placeholder="Specialties, comma separated"
            className="rounded-2xl bg-white/5 px-4 py-2.5 text-sm outline-none"
          />
        </div>
        <button
          onClick={() => addStaff.mutate()}
          className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          <Plus className="size-4" /> Add stylist
        </button>

        <div className="space-y-2">
          {staff.map((s) => (
            <div
              key={s.id}
              className={cn(
                "flex items-center gap-3 rounded-2xl bg-white/[0.04] px-4 py-3",
                !s.is_active && "opacity-45",
              )}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{s.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {s.role}
                  {s.specialties?.length ? ` · ${s.specialties.join(", ")}` : ""}
                </p>
              </div>
              <button
                onClick={() => toggleStaff.mutate(s)}
                className={cn(
                  "flex size-8 items-center justify-center rounded-full",
                  s.is_active ? "bg-success/15 text-success" : "bg-white/5 text-muted-foreground",
                )}
                aria-label="Toggle stylist"
              >
                <Power className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
