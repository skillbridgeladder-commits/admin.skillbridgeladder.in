-- Add requirements column to jobs table
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS requirements TEXT DEFAULT '';
