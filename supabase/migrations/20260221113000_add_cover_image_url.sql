-- Add cover_image_url column to website_categories
ALTER TABLE website_categories ADD COLUMN IF NOT EXISTS cover_image_url TEXT;
