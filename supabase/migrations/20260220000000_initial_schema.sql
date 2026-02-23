-- Create the events table
create table events (
  id bigint primary key generated always as identity,
  wedding_name text not null,
  date text not null,
  categories text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table events enable row level security;

-- Create policy to allow authenticated users to read all events
create policy "Authenticated users can read events"
on public.events
for select to authenticated
using (true);

-- Create policy to allow authenticated users to insert events
create policy "Authenticated users can insert events"
on public.events
for insert to authenticated
with check (true);

-- Create policy to allow authenticated users to update events
create policy "Authenticated users can update events"
on public.events
for update to authenticated
using (true);

-- Create policy to allow authenticated users to delete events
create policy "Authenticated users can delete events"
on public.events
for delete to authenticated
using (true);
-- Create client_users table
create table public.client_users (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  username text unique not null,
  password text not null, -- Storing plain text as requested for simplicity, in production should be hashed
  wedding_name text -- Optional description
);

-- Create client_event_access table
create table public.client_event_access (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  client_id uuid references public.client_users(id) on delete cascade not null,
  event_id bigint references public.events(id) on delete cascade not null, -- Changed to bigint to match events.id
  unique(client_id, event_id)
);

-- Enable RLS
alter table public.client_users enable row level security;
alter table public.client_event_access enable row level security;

-- Policies for client_users
-- Admins (service role) can do everything
create policy "Allow full access to admins"
  on public.client_users
  for all
  using (true)
  with check (true);

-- Policies for client_event_access
-- Admins can do everything
create policy "Allow full access to admins"
  on public.client_event_access
  for all
  using (true)
  with check (true);

-- Public access for client login (read-only for specific username/password check)
-- Actually, for now we'll use a simple query from the client side using the anon key.
-- Since we are not using Supabase Auth for these users (custom auth), 
-- we need to allow read access to the anon key for login verification.
create policy "Allow public read access"
  on public.client_users
  for select
  to anon
  using (true);

create policy "Allow public read access"
  on public.client_event_access
  for select
  to anon
  using (true);
