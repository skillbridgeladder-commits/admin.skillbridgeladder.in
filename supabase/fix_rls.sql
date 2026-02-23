-- ========================================
-- RLS FIX: Update admin email in all policies
-- Run this in Supabase SQL Editor
-- ========================================

-- Drop all old admin policies
DROP POLICY IF EXISTS "Admin full access to jobs" ON jobs;
DROP POLICY IF EXISTS "Admin full access to applications" ON applications;
DROP POLICY IF EXISTS "Admin full access to chat_rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Admin full access to messages" ON messages;
DROP POLICY IF EXISTS "Admin can update site settings" ON site_settings;
DROP POLICY IF EXISTS "Admin full access to profiles" ON profiles;

-- Recreate with correct admin email
CREATE POLICY "Admin full access to jobs" ON jobs
  FOR ALL USING (
    auth.jwt() ->> 'email' = 'skillbridgeladder@gmail.com'
  );

CREATE POLICY "Admin full access to applications" ON applications
  FOR ALL USING (
    auth.jwt() ->> 'email' = 'skillbridgeladder@gmail.com'
  );

CREATE POLICY "Admin full access to chat_rooms" ON chat_rooms
  FOR ALL USING (
    auth.jwt() ->> 'email' = 'skillbridgeladder@gmail.com'
  );

CREATE POLICY "Admin full access to messages" ON messages
  FOR ALL USING (
    auth.jwt() ->> 'email' = 'skillbridgeladder@gmail.com'
  );

CREATE POLICY "Admin can update site settings" ON site_settings
  FOR UPDATE USING (
    auth.jwt() ->> 'email' = 'skillbridgeladder@gmail.com'
  );

CREATE POLICY "Admin full access to profiles" ON profiles
  FOR ALL USING (
    auth.jwt() ->> 'email' = 'skillbridgeladder@gmail.com'
  );

-- Add collect_email column to jobs (if not exists)
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS collect_email BOOLEAN DEFAULT true;
