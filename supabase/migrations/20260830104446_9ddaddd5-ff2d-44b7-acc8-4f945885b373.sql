DROP POLICY IF EXISTS "Public can view active staff" ON public.staff;

REVOKE SELECT ON public.staff FROM anon;

CREATE OR REPLACE VIEW public.staff_public
WITH (security_invoker = off) AS
SELECT id, name, role, is_active
FROM public.staff
WHERE is_active = true;

GRANT SELECT ON public.staff_public TO anon, authenticated;