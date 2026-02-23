-- Rename categories → event_type, district → place
alter table public.events
  rename column categories to event_type;

alter table public.events
  rename column district to place;
