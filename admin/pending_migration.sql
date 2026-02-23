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
