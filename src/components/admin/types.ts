import type { Tables } from "@/integrations/supabase/types";

export type Service = Tables<"services">;
export type Staff = Tables<"staff">;
export type Customer = Tables<"customers">;
export type Appointment = Tables<"appointments">;
export type Invoice = Tables<"invoices">;
export type Expense = Tables<"expenses">;

export type PosLineItem = {
  serviceId: string | null;
  name: string;
  price: number;
  qty: number;
};

export type PosDraft = {
  customerName: string;
  customerPhone: string;
  staffId: string | null;
  items: PosLineItem[];
  appointmentId?: string;
};
