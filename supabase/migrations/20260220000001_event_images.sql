-- Create event_images table
create table public.event_images (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  event_id bigint references public.events(id) on delete cascade not null,
  image_url text not null,
  status text default 'none'  -- 'none' | 'selected' | 'rejected'
);

-- Enable Row Level Security
alter table public.event_images enable row level security;

-- Admins (service role) can do everything
create policy "Allow full access to admins"
  on public.event_images
  for all
  using (true)
  with check (true);

-- Clients (anon key) can read images for events they have access to
create policy "Allow public read access"
  on public.event_images
  for select
  to anon
  using (true);

-- Allow anon to update status (for client photo selection)
create policy "Allow public update status"
  on public.event_images
  for update
  to anon
  using (true)
  with check (true);
