-- Preserve legacy salon records without merging them. Only members of the designated Paragon salon can access business data.
CREATE OR REPLACE FUNCTION public.current_salon_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT 'cfb0f888-d012-443f-8717-a0c9d1556c9c'::uuid
  WHERE EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND salon_id = 'cfb0f888-d012-443f-8717-a0c9d1556c9c'::uuid
      AND role IN ('admin', 'staff')
  )
$$;
REVOKE ALL ON FUNCTION public.current_salon_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_salon_id() TO authenticated;

CREATE TABLE public.access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  email text NOT NULL CHECK (char_length(email) <= 255),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.access_requests TO authenticated;
GRANT UPDATE ON public.access_requests TO authenticated;
GRANT ALL ON public.access_requests TO service_role;
ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see their access request" ON public.access_requests FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users request their own access" ON public.access_requests FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND status = 'pending');
CREATE POLICY "Paragon owner reviews access" ON public.access_requests FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.salons s WHERE s.id = 'cfb0f888-d012-443f-8717-a0c9d1556c9c'::uuid AND s.owner_id = auth.uid()));
COMMENT ON COLUMN public.salons.slug IS 'DEPRECATED: the public booking page no longer uses salon slugs.';