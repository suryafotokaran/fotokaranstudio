-- Add client fields directly to events
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS client_name TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS client_phone TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS client_email TEXT;

-- Remove client_id which was a reference to the clients table
ALTER TABLE public.events DROP COLUMN IF EXISTS client_id;

-- Drop the clients table as requested
DROP TABLE IF EXISTS public.clients CASCADE;
