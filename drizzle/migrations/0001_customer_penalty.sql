ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS penalty_active boolean NOT NULL DEFAULT false;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS penalty_at timestamptz;