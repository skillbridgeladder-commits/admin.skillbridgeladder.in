-- Run this in your Supabase SQL Editor to fix the Admin Chat participant visibility
-- This creates a direct link between chat rooms and profiles for better joining

ALTER TABLE chat_rooms 
DROP CONSTRAINT IF EXISTS chat_rooms_freelancer_id_fkey;

ALTER TABLE chat_rooms
ADD CONSTRAINT chat_rooms_freelancer_id_fkey 
FOREIGN KEY (freelancer_id) REFERENCES profiles(id)
ON DELETE CASCADE;

-- Also ensure the summary column exists in profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS summary TEXT DEFAULT '';

-- FORCE CACHE RELOAD (Run this if the API still doesn't see the column)
NOTIFY pgrst, 'reload schema';
