
CREATE TABLE public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'Hair',
  price numeric(10,2) NOT NULL DEFAULT 0,
  duration_minutes integer NOT NULL DEFAULT 30,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.services TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.services TO authenticated;
GRANT ALL ON public.services TO service_role;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view active services" ON public.services FOR SELECT TO anon USING (is_active = true);
CREATE POLICY "Staff can manage services" ON public.services FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  role text NOT NULL DEFAULT 'Barber',
  commission_rate numeric(5,2) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.staff TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff TO authenticated;
GRANT ALL ON public.staff TO service_role;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view active staff" ON public.staff FOR SELECT TO anon USING (is_active = true);
CREATE POLICY "Staff can manage staff" ON public.staff FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL UNIQUE,
  total_visits integer NOT NULL DEFAULT 0,
  total_spent numeric(12,2) NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage customers" ON public.customers FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_code text NOT NULL UNIQUE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  service_ids uuid[] NOT NULL DEFAULT '{}',
  appointment_date date NOT NULL,
  start_time time NOT NULL,
  total_amount numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','in-service','completed','cancelled')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;
GRANT ALL ON public.appointments TO service_role;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage appointments" ON public.appointments FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_no text NOT NULL UNIQUE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  discount_pct numeric(5,2) NOT NULL DEFAULT 0,
  total_amount numeric(12,2) NOT NULL DEFAULT 0,
  paid_amount numeric(12,2) NOT NULL DEFAULT 0,
  due_amount numeric(12,2) NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'Cash' CHECK (payment_method IN ('Cash','Card','JazzCash','EasyPaisa')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage invoices" ON public.invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text NOT NULL DEFAULT 'Products' CHECK (category IN ('Rent','Utilities','Products','Staff Salary','Tea/Refreshments')),
  amount numeric(12,2) NOT NULL DEFAULT 0,
  expense_date date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT ALL ON public.expenses TO service_role;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage expenses" ON public.expenses FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
ALTER TABLE public.appointments REPLICA IDENTITY FULL;

INSERT INTO public.services (name, category, price, duration_minutes, description) VALUES
  ('Signature Haircut','Hair',1200,45,'Consultation, precision cut and styling finish'),
  ('Skin Fade','Hair',1500,45,'Sharp tapered fade with razor detailing'),
  ('Kids Haircut','Hair',800,30,'Gentle cut for young gentlemen'),
  ('Hair Wash & Blow Dry','Hair',600,30,'Deep cleanse with a salon blow dry'),
  ('Beard Trim & Shape','Beard',700,30,'Line-up, shape and beard oil finish'),
  ('Royal Hot Towel Shave','Beard',1000,45,'Classic straight razor shave with hot towels'),
  ('Beard Colour','Beard',1300,45,'Ammonia-free colour matched to your tone'),
  ('Express Cleanup Facial','Skin',1500,30,'Quick glow-up cleanse and massage'),
  ('Gold Glow Facial','Skin',3000,60,'24k gold mask with lymphatic massage'),
  ('Charcoal Detox Facial','Skin',2500,60,'Deep pore detox for oily skin'),
  ('Royal Groom Package','Packages',5500,120,'Haircut, hot towel shave, gold facial and head massage'),
  ('Groom Prep Package','Packages',4200,90,'Haircut, beard shape and express facial'),
  ('Father & Son Package','Packages',1800,60,'Signature haircut plus kids haircut');

INSERT INTO public.staff (name, phone, role, commission_rate) VALUES
  ('Usman Ali','+923001112233','Master Barber',20),
  ('Hamza Sheikh','+923004445566','Hair Stylist',15),
  ('Bilal Ahmed','+923007778899','Skin Specialist',18);

INSERT INTO public.customers (name, phone, total_visits, total_spent, notes) VALUES
  ('Ahmed Raza','+923211234567',12,26400,'Prefers scissor cut, no clippers on top'),
  ('Zain Malik','+923219876543',5,11500,'Allergic to strong fragrances'),
  ('Faisal Khan','+923005556677',8,19800,'Regular Saturday 6 PM slot'),
  ('Hassan Tariq','+923331239876',3,6200,NULL),
  ('Imran Sadiq','+923451112244',20,54300,'VIP - offer tea on arrival');

INSERT INTO public.appointments (booking_code, customer_id, staff_id, service_ids, appointment_date, start_time, total_amount, status, notes)
SELECT 'SLN-100231', c.id, s.id, ARRAY[(SELECT id FROM public.services WHERE name='Signature Haircut'),(SELECT id FROM public.services WHERE name='Beard Trim & Shape')], current_date, '12:00', 1900, 'pending', 'Walk-in requested'
FROM public.customers c, public.staff s WHERE c.phone='+923211234567' AND s.name='Usman Ali';
INSERT INTO public.appointments (booking_code, customer_id, staff_id, service_ids, appointment_date, start_time, total_amount, status, notes)
SELECT 'SLN-100232', c.id, s.id, ARRAY[(SELECT id FROM public.services WHERE name='Skin Fade')], current_date, '13:30', 1500, 'confirmed', NULL
FROM public.customers c, public.staff s WHERE c.phone='+923219876543' AND s.name='Hamza Sheikh';
INSERT INTO public.appointments (booking_code, customer_id, staff_id, service_ids, appointment_date, start_time, total_amount, status, notes)
SELECT 'SLN-100233', c.id, s.id, ARRAY[(SELECT id FROM public.services WHERE name='Gold Glow Facial')], current_date, '15:00', 3000, 'in-service', 'Sensitive skin'
FROM public.customers c, public.staff s WHERE c.phone='+923005556677' AND s.name='Bilal Ahmed';
INSERT INTO public.appointments (booking_code, customer_id, staff_id, service_ids, appointment_date, start_time, total_amount, status, notes)
SELECT 'SLN-100234', c.id, s.id, ARRAY[(SELECT id FROM public.services WHERE name='Royal Groom Package')], current_date, '17:00', 5500, 'confirmed', 'Wedding on Sunday'
FROM public.customers c, public.staff s WHERE c.phone='+923451112244' AND s.name='Usman Ali';
INSERT INTO public.appointments (booking_code, customer_id, staff_id, service_ids, appointment_date, start_time, total_amount, status, notes)
SELECT 'SLN-100235', c.id, s.id, ARRAY[(SELECT id FROM public.services WHERE name='Kids Haircut')], current_date, '11:00', 800, 'completed', NULL
FROM public.customers c, public.staff s WHERE c.phone='+923331239876' AND s.name='Hamza Sheikh';
INSERT INTO public.appointments (booking_code, customer_id, staff_id, service_ids, appointment_date, start_time, total_amount, status, notes)
SELECT 'SLN-100236', c.id, s.id, ARRAY[(SELECT id FROM public.services WHERE name='Royal Hot Towel Shave')], current_date + 1, '18:00', 1000, 'pending', NULL
FROM public.customers c, public.staff s WHERE c.phone='+923211234567' AND s.name='Usman Ali';

INSERT INTO public.invoices (invoice_no, customer_id, staff_id, items, subtotal, discount_pct, total_amount, paid_amount, due_amount, payment_method, created_at)
SELECT 'INV-20001', c.id, s.id, '[{"name":"Signature Haircut","price":1200,"qty":1},{"name":"Beard Trim & Shape","price":700,"qty":1}]'::jsonb, 1900, 0, 1900, 1900, 0, 'Cash', now() - interval '2 hours'
FROM public.customers c, public.staff s WHERE c.phone='+923211234567' AND s.name='Usman Ali';
INSERT INTO public.invoices (invoice_no, customer_id, staff_id, items, subtotal, discount_pct, total_amount, paid_amount, due_amount, payment_method, created_at)
SELECT 'INV-20002', c.id, s.id, '[{"name":"Gold Glow Facial","price":3000,"qty":1}]'::jsonb, 3000, 10, 2700, 2000, 700, 'JazzCash', now() - interval '5 hours'
FROM public.customers c, public.staff s WHERE c.phone='+923005556677' AND s.name='Bilal Ahmed';
INSERT INTO public.invoices (invoice_no, customer_id, staff_id, items, subtotal, discount_pct, total_amount, paid_amount, due_amount, payment_method, created_at)
SELECT 'INV-20003', c.id, s.id, '[{"name":"Royal Groom Package","price":5500,"qty":1}]'::jsonb, 5500, 5, 5225, 5225, 0, 'Card', now() - interval '1 day'
FROM public.customers c, public.staff s WHERE c.phone='+923451112244' AND s.name='Usman Ali';
INSERT INTO public.invoices (invoice_no, customer_id, staff_id, items, subtotal, discount_pct, total_amount, paid_amount, due_amount, payment_method, created_at)
SELECT 'INV-20004', c.id, s.id, '[{"name":"Skin Fade","price":1500,"qty":1},{"name":"Hair Wash & Blow Dry","price":600,"qty":1}]'::jsonb, 2100, 0, 2100, 1000, 1100, 'EasyPaisa', now() - interval '3 days'
FROM public.customers c, public.staff s WHERE c.phone='+923219876543' AND s.name='Hamza Sheikh';
INSERT INTO public.invoices (invoice_no, customer_id, staff_id, items, subtotal, discount_pct, total_amount, paid_amount, due_amount, payment_method, created_at)
SELECT 'INV-20005', c.id, s.id, '[{"name":"Kids Haircut","price":800,"qty":2}]'::jsonb, 1600, 0, 1600, 1600, 0, 'Cash', now() - interval '6 days'
FROM public.customers c, public.staff s WHERE c.phone='+923331239876' AND s.name='Hamza Sheikh';

INSERT INTO public.expenses (title, category, amount, expense_date) VALUES
  ('Shop rent - current month','Rent',85000, date_trunc('month', current_date)::date),
  ('Electricity bill','Utilities',18500, date_trunc('month', current_date)::date + 4),
  ('Hair colour & pomade restock','Products',12400, current_date - 5),
  ('Staff salaries advance','Staff Salary',45000, date_trunc('month', current_date)::date + 1),
  ('Tea & refreshments','Tea/Refreshments',3200, current_date - 1),
  ('Towel laundry service','Utilities',2600, current_date);
