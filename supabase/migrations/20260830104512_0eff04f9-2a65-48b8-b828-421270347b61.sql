DROP VIEW IF EXISTS public.staff_public;

CREATE OR REPLACE FUNCTION public.get_public_staff()
RETURNS TABLE (id uuid, name text, role text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.name, s.role
  FROM public.staff s
  WHERE s.is_active = true
  ORDER BY s.name
$$;

GRANT EXECUTE ON FUNCTION public.get_public_staff() TO anon, authenticated;