-- Website Management Tables

-- Categories table (is_default=true means cannot be deleted or renamed)
create table if not exists website_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_default boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz default now()
);

-- Seed the two protected default categories
insert into website_categories (name, is_default, sort_order) values
  ('Desktop Banner', true, 0),
  ('Mobile Banner',  true, 1)
on conflict do nothing;

-- Images per category
create table if not exists website_category_images (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references website_categories(id) on delete cascade,
  image_url text not null,
  alt_text text,
  sort_order int not null default 0,
  created_at timestamptz default now()
);

-- Enable RLS (open to authenticated users for admin)
alter table website_categories enable row level security;
alter table website_category_images enable row level security;

create policy "Allow all for authenticated" on website_categories
  for all using (auth.role() = 'authenticated');

create policy "Allow all for authenticated" on website_category_images
  for all using (auth.role() = 'authenticated');
