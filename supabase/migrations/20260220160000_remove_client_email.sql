-- Remove client_email column from events
ALTER TABLE public.events DROP COLUMN IF EXISTS client_email;
