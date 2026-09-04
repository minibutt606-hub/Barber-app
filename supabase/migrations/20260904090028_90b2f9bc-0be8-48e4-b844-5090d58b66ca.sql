
CREATE TABLE public.salons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  tagline text NOT NULL DEFAULT 'Precision grooming, royal treatment',
  address text,
  phone text,
  whatsapp text,
  open_from text NOT NULL DEFAULT '11:00 AM',
  open_to text NOT NULL DEFAULT '3:00 AM',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.salons TO authenticated;
GRANT ALL ON public.salons TO service_role;
ALTER TABLE public.salons ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.user_roles ADD COLUMN salon_id uuid REFERENCES public.salons(id) ON DELETE CASCADE;

CREATE OR REPLACE FUNCTION public.current_salon_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT salon_id FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.current_salon_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_salon_id() TO authenticated;

CREATE POLICY "Members can view their salon" ON public.salons FOR SELECT TO authenticated
  USING (id = public.current_salon_id());
CREATE POLICY "Owner can update their salon" ON public.salons FOR UPDATE TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

-- Give every existing role-holder their own salon workspace
INSERT INTO public.salons (owner_id, name, slug)
SELECT DISTINCT ur.user_id, 'My Salon', 'salon-' || substr(replace(ur.user_id::text,'-',''), 1, 8)
FROM public.user_roles ur;

UPDATE public.user_roles ur
SET salon_id = s.id
FROM public.salons s
WHERE s.owner_id = ur.user_id AND ur.salon_id IS NULL;

DELETE FROM public.user_roles WHERE salon_id IS NULL;
ALTER TABLE public.user_roles ALTER COLUMN salon_id SET NOT NULL;

-- Scope all salon data tables
ALTER TABLE public.services   ADD COLUMN salon_id uuid REFERENCES public.salons(id) ON DELETE CASCADE;
ALTER TABLE public.staff      ADD COLUMN salon_id uuid REFERENCES public.salons(id) ON DELETE CASCADE;
ALTER TABLE public.customers  ADD COLUMN salon_id uuid REFERENCES public.salons(id) ON DELETE CASCADE;
ALTER TABLE public.appointments ADD COLUMN salon_id uuid REFERENCES public.salons(id) ON DELETE CASCADE;
ALTER TABLE public.invoices   ADD COLUMN salon_id uuid REFERENCES public.salons(id) ON DELETE CASCADE;
ALTER TABLE public.expenses   ADD COLUMN salon_id uuid REFERENCES public.salons(id) ON DELETE CASCADE;

DELETE FROM public.invoices WHERE salon_id IS NULL;
DELETE FROM public.expenses WHERE salon_id IS NULL;
DELETE FROM public.appointments WHERE salon_id IS NULL;
DELETE FROM public.customers WHERE salon_id IS NULL;
DELETE FROM public.services WHERE salon_id IS NULL;
DELETE FROM public.staff WHERE salon_id IS NULL;

ALTER TABLE public.services   ALTER COLUMN salon_id SET NOT NULL, ALTER COLUMN salon_id SET DEFAULT public.current_salon_id();
ALTER TABLE public.staff      ALTER COLUMN salon_id SET NOT NULL, ALTER COLUMN salon_id SET DEFAULT public.current_salon_id();
ALTER TABLE public.customers  ALTER COLUMN salon_id SET NOT NULL, ALTER COLUMN salon_id SET DEFAULT public.current_salon_id();
ALTER TABLE public.appointments ALTER COLUMN salon_id SET NOT NULL, ALTER COLUMN salon_id SET DEFAULT public.current_salon_id();
ALTER TABLE public.invoices   ALTER COLUMN salon_id SET NOT NULL, ALTER COLUMN salon_id SET DEFAULT public.current_salon_id();
ALTER TABLE public.expenses   ALTER COLUMN salon_id SET NOT NULL, ALTER COLUMN salon_id SET DEFAULT public.current_salon_id();

CREATE INDEX ON public.services (salon_id);
CREATE INDEX ON public.staff (salon_id);
CREATE INDEX ON public.customers (salon_id);
CREATE INDEX ON public.appointments (salon_id);
CREATE INDEX ON public.invoices (salon_id);
CREATE INDEX ON public.expenses (salon_id);

-- Replace old tenant-wide policies with salon-scoped ones
DROP POLICY IF EXISTS "Staff can manage services" ON public.services;
DROP POLICY IF EXISTS "Public can view active services" ON public.services;
DROP POLICY IF EXISTS "Staff can manage staff" ON public.staff;
DROP POLICY IF EXISTS "Staff can manage customers" ON public.customers;
DROP POLICY IF EXISTS "Staff can manage appointments" ON public.appointments;
DROP POLICY IF EXISTS "Staff can manage invoices" ON public.invoices;
DROP POLICY IF EXISTS "Staff can manage expenses" ON public.expenses;

CREATE POLICY "Salon members manage services" ON public.services FOR ALL TO authenticated
  USING (salon_id = public.current_salon_id()) WITH CHECK (salon_id = public.current_salon_id());
CREATE POLICY "Salon members manage staff" ON public.staff FOR ALL TO authenticated
  USING (salon_id = public.current_salon_id()) WITH CHECK (salon_id = public.current_salon_id());
CREATE POLICY "Salon members manage customers" ON public.customers FOR ALL TO authenticated
  USING (salon_id = public.current_salon_id()) WITH CHECK (salon_id = public.current_salon_id());
CREATE POLICY "Salon members manage appointments" ON public.appointments FOR ALL TO authenticated
  USING (salon_id = public.current_salon_id()) WITH CHECK (salon_id = public.current_salon_id());
CREATE POLICY "Salon members manage invoices" ON public.invoices FOR ALL TO authenticated
  USING (salon_id = public.current_salon_id()) WITH CHECK (salon_id = public.current_salon_id());
CREATE POLICY "Salon members manage expenses" ON public.expenses FOR ALL TO authenticated
  USING (salon_id = public.current_salon_id()) WITH CHECK (salon_id = public.current_salon_id());
