-- Allow public read access for banner categories and images
create policy "Allow public select on website_categories" on website_categories
  for select using (true);

create policy "Allow public select on website_category_images" on website_category_images
  for select using (true);
