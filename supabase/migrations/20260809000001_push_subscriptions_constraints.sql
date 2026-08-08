-- Clean invalid subscriptions first
DELETE FROM public.push_subscriptions
WHERE keys IS NULL
   OR endpoint NOT LIKE 'https://%';

-- Add unique constraint on endpoint if not already existing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'unique_endpoint'
    ) THEN
        ALTER TABLE public.push_subscriptions ADD CONSTRAINT unique_endpoint UNIQUE (endpoint);
    END IF;
END $$;

-- Add check constraint for valid https endpoints
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'valid_endpoint'
    ) THEN
        ALTER TABLE public.push_subscriptions ADD CONSTRAINT valid_endpoint CHECK (endpoint LIKE 'https://%');
    END IF;
END $$;

-- Ensure keys column cannot be NULL
ALTER TABLE public.push_subscriptions ALTER COLUMN keys SET NOT NULL;

-- Update RLS policies to allow explicit public insert with check
DROP POLICY IF EXISTS "Allow all access to subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Allow public insert subscriptions" ON public.push_subscriptions;

CREATE POLICY "Allow public insert subscriptions" ON public.push_subscriptions 
FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow all access to subscriptions" ON public.push_subscriptions 
FOR ALL USING (true);
