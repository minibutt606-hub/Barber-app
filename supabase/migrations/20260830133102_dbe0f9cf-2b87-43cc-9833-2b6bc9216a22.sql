DROP FUNCTION IF EXISTS public.get_public_staff();

CREATE VIEW public.public_staff AS
  SELECT s.id, s.name, s.role
  FROM public.staff s
  WHERE s.is_active = true;

ALTER VIEW public.public_staff SET (security_invoker = off);

GRANT SELECT ON public.public_staff TO anon, authenticated;
GRANT ALL ON public.public_staff TO service_role;