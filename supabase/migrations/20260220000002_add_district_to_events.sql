-- Add district column to events table
alter table public.events add column if not exists district text default '';
