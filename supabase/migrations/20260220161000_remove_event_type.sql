-- Remove event_type column from events table
ALTER TABLE events DROP COLUMN IF EXISTS event_type;
