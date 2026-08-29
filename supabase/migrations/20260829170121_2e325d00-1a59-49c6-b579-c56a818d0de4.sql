-- Roles
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin','staff');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_salon_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','staff'));
$$;

DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Bootstrap: existing accounts become admins so the owner keeps access
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role FROM auth.users
ON CONFLICT (user_id, role) DO NOTHING;

-- Restrict business tables to verified staff
DROP POLICY IF EXISTS "Staff can manage customers" ON public.customers;
CREATE POLICY "Staff can manage customers" ON public.customers
  FOR ALL TO authenticated USING (public.is_salon_staff(auth.uid())) WITH CHECK (public.is_salon_staff(auth.uid()));

DROP POLICY IF EXISTS "Staff can manage appointments" ON public.appointments;
CREATE POLICY "Staff can manage appointments" ON public.appointments
  FOR ALL TO authenticated USING (public.is_salon_staff(auth.uid())) WITH CHECK (public.is_salon_staff(auth.uid()));

DROP POLICY IF EXISTS "Staff can manage invoices" ON public.invoices;
CREATE POLICY "Staff can manage invoices" ON public.invoices
  FOR ALL TO authenticated USING (public.is_salon_staff(auth.uid())) WITH CHECK (public.is_salon_staff(auth.uid()));

DROP POLICY IF EXISTS "Staff can manage expenses" ON public.expenses;
CREATE POLICY "Staff can manage expenses" ON public.expenses
  FOR ALL TO authenticated USING (public.is_salon_staff(auth.uid())) WITH CHECK (public.is_salon_staff(auth.uid()));

DROP POLICY IF EXISTS "Staff can manage staff" ON public.staff;
CREATE POLICY "Staff can manage staff" ON public.staff
  FOR ALL TO authenticated USING (public.is_salon_staff(auth.uid())) WITH CHECK (public.is_salon_staff(auth.uid()));

DROP POLICY IF EXISTS "Staff can manage services" ON public.services;
CREATE POLICY "Staff can manage services" ON public.services
  FOR ALL TO authenticated USING (public.is_salon_staff(auth.uid())) WITH CHECK (public.is_salon_staff(auth.uid()));

-- Public no longer reads staff phone / commission; expose a safe view instead
DROP POLICY IF EXISTS "Public can view active staff" ON public.staff;
REVOKE SELECT ON public.staff FROM anon;

CREATE OR REPLACE VIEW public.public_staff AS
  SELECT id, name, role FROM public.staff WHERE is_active = true;

GRANT SELECT ON public.public_staff TO anon, authenticated;