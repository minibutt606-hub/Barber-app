DROP POLICY IF EXISTS "Anon can view active staff basics" ON public.staff;

REVOKE ALL ON public.staff FROM anon;

DROP VIEW IF EXISTS public.public_staff;

CREATE VIEW public.public_staff
WITH (security_invoker = false)
AS
SELECT id, name, role
FROM public.staff
WHERE is_active = true;

GRANT SELECT ON public.public_staff TO anon;
GRANT SELECT ON public.public_staff TO authenticated;