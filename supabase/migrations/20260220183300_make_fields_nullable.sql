-- Make date and wedding_name nullable to allow minimal bookings
ALTER TABLE IF EXISTS public.events ALTER COLUMN date DROP NOT NULL;
ALTER TABLE IF EXISTS public.events ALTER COLUMN wedding_name DROP NOT NULL;
