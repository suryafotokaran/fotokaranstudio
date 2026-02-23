-- Migration: Add dual-folder image support
-- Run this in your Supabase SQL editor

-- 1. Add compressed_url column to event_images
--    image_url = original high-res S3 URL
--    compressed_url = web-optimized compressed S3 URL
ALTER TABLE event_images ADD COLUMN IF NOT EXISTS compressed_url text;

-- 2. Add show_compressed toggle to events
--    true  = clients see compressed images (default, faster loading)
--    false = clients see original images
ALTER TABLE events ADD COLUMN IF NOT EXISTS show_compressed boolean DEFAULT true;
