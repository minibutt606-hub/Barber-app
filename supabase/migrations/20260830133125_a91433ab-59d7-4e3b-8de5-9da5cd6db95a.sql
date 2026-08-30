ALTER VIEW public.public_staff SET (security_invoker = on);

REVOKE ALL ON public.staff FROM anon;
GRANT SELECT (id, name, role, is_active) ON public.staff TO anon;

DROP POLICY IF EXISTS "Anon can view active staff basics" ON public.staff;
CREATE POLICY "Anon can view active staff basics"
ON public.staff
FOR SELECT
TO anon
USING (is_active = true);