-- Create Clients Table
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Update Events Table
-- Note: Checking if columns exist before adding to avoid errors if partially implemented
DO $$ 
BEGIN 
    -- Add client_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='client_id') THEN
        ALTER TABLE public.events ADD COLUMN client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;
    END IF;

    -- Add event_name
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='event_name') THEN
        ALTER TABLE public.events ADD COLUMN event_name TEXT;
    END IF;

    -- Add event_type
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='event_type') THEN
        ALTER TABLE public.events ADD COLUMN event_type TEXT;
    END IF;

    -- Add event_date (converting or adding)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='event_date') THEN
        ALTER TABLE public.events ADD COLUMN event_date DATE;
    END IF;

    -- Add start_time
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='start_time') THEN
        ALTER TABLE public.events ADD COLUMN start_time TIME;
    END IF;

    -- Add end_time
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='end_time') THEN
        ALTER TABLE public.events ADD COLUMN end_time TIME;
    END IF;

    -- Add event_place
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='event_place') THEN
        ALTER TABLE public.events ADD COLUMN event_place TEXT;
    END IF;

    -- Add price_quote
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='price_quote') THEN
        ALTER TABLE public.events ADD COLUMN price_quote NUMERIC DEFAULT 0;
    END IF;

    -- Add advance_paid
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='advance_paid') THEN
        ALTER TABLE public.events ADD COLUMN advance_paid NUMERIC DEFAULT 0;
    END IF;

    -- Add payment_method
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='payment_method') THEN
        ALTER TABLE public.events ADD COLUMN payment_method TEXT;
    END IF;

    -- Add photos_committed
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='photos_committed') THEN
        ALTER TABLE public.events ADD COLUMN photos_committed INTEGER DEFAULT 0;
    END IF;

    -- Add description
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='description') THEN
        ALTER TABLE public.events ADD COLUMN description TEXT;
    END IF;

    -- Add assistant_name
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='assistant_name') THEN
        ALTER TABLE public.events ADD COLUMN assistant_name TEXT;
    END IF;

    -- Add status
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='status') THEN
        ALTER TABLE public.events ADD COLUMN status TEXT DEFAULT 'upcoming';
    END IF;
END $$;

-- Enable RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Policies for Clients
CREATE POLICY "Allow all access for authenticated users on clients" 
ON public.clients FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Ensure policies exist for events (already enabled but adding for new columns if needed)
-- (Existing policies usually cover all columns, but we'll re-check and ensure they work)

-- Add index for client_id on events
CREATE INDEX IF NOT EXISTS idx_events_client_id ON public.events(client_id);
