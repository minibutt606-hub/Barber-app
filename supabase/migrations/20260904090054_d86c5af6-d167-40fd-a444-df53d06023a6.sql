
CREATE OR REPLACE FUNCTION public.current_salon_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT salon_id FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.current_salon_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_salon_id() TO authenticated;
