import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { formatMoney, formatTime } from "@/lib/salon";

export type BookingAlert = {
  id: string;
  code: string;
  amount: number;
  time: string;
  date: string;
  at: number;
};

function playChime() {
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    [880, 1174].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.18;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.2, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.3);
    });
  } catch {
    /* audio is a nice-to-have */
  }
}

/** Listens for new client bookings anywhere in the admin panel. */
export function useBookingAlerts() {
  const queryClient = useQueryClient();
  const [alerts, setAlerts] = useState<BookingAlert[]>([]);
  const [unread, setUnread] = useState(0);
  const seen = useRef<Set<string>>(new Set());

  const clearUnread = useCallback(() => setUnread(0), []);

  useEffect(() => {
    const channel = supabase
      .channel("admin-booking-alerts")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointments" },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ["admin-board"] });
          queryClient.invalidateQueries({ queryKey: ["admin-financials"] });
          if (payload.eventType !== "INSERT") return;

          const row = payload.new as {
            id: string;
            booking_code: string;
            total_amount: number;
            start_time: string;
            appointment_date: string;
          };
          if (seen.current.has(row.id)) return;
          seen.current.add(row.id);

          playChime();
          setUnread((n) => n + 1);
          setAlerts((prev) =>
            [
              {
                id: row.id,
                code: row.booking_code,
                amount: Number(row.total_amount ?? 0),
                time: String(row.start_time).slice(0, 5),
                date: row.appointment_date,
                at: Date.now(),
              },
              ...prev,
            ].slice(0, 12),
          );
          toast.success("New booking received", {
            description: `Ref ${row.booking_code} · ${formatTime(
              String(row.start_time).slice(0, 5),
            )} · ${formatMoney(Number(row.total_amount ?? 0))}`,
            duration: 8000,
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return { alerts, unread, clearUnread };
}
