-- Ensure website-images bucket exists
insert into storage.buckets (id, name, public)
values ('website-images', 'website-images', true)
on conflict (id) do nothing;

-- Set up storage policies for the bucket
-- Allow public read access
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'website-images' );

-- Allow authenticated users (admin) to manage images
create policy "Admin Manage Images"
  on storage.objects for all
  using ( bucket_id = 'website-images' and auth.role() = 'authenticated' );
