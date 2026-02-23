-- Create the event_images table if it doesn't exist
create table if not exists event_images (
  id bigint primary key generated always as identity,
  event_id bigint references events(id) on delete cascade not null,
  image_url text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table event_images enable row level security;

-- Drop existing policies to ensure clean state
drop policy if exists "Authenticated users can read event_images" on event_images;
drop policy if exists "Authenticated users can insert event_images" on event_images;
drop policy if exists "Authenticated users can delete event_images" on event_images;

-- Create policy to allow authenticated users to read all event_images
create policy "Authenticated users can read event_images"
on public.event_images
for select to authenticated
using (true);

-- Create policy to allow authenticated users to insert event_images
create policy "Authenticated users can insert event_images"
on public.event_images
for insert to authenticated
with check (true);

-- Create policy to allow authenticated users to delete event_images
create policy "Authenticated users can delete event_images"
on public.event_images
for delete to authenticated
using (true);

-- Policies for anonymous access (admin panel uses anon key)
create policy "Anon users can read event_images"
on public.event_images
for select to anon
using (true);

create policy "Anon users can insert event_images"
on public.event_images
for insert to anon
with check (true);

create policy "Anon users can delete event_images"
on public.event_images
for delete to anon
using (true);
