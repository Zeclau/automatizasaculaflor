
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS external_source_url text,
  ADD COLUMN IF NOT EXISTS is_fast_track boolean NOT NULL DEFAULT false;

ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS phone_country_code text,
  ADD COLUMN IF NOT EXISTS phone_number text;
