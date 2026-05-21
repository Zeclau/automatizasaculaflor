ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS pin_hash text,
  ADD COLUMN IF NOT EXISTS pin_failed_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pin_locked_until timestamptz;

CREATE POLICY "agents update all"
ON public.agents
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);