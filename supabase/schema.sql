-- SkillBridge Ladder — Full Database Schema
-- Run this in Supabase SQL Editor

-- 1. Enums
CREATE TYPE application_status AS ENUM ('Applied', 'Round 1', 'Interview', 'Hired', 'Rejected');

-- 2. Jobs table (with dynamic form schema)
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  form_schema JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Applications table
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
  form_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  status application_status DEFAULT 'Applied',
  private_notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, job_id)
);

-- 4. Chat rooms (1-to-1: Admin ↔ Freelancer)
CREATE TABLE chat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  freelancer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Messages (E2EE — only ciphertext stored)
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  encrypted_content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Site settings (single-row config)
CREATE TABLE site_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  maintenance_mode BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default settings row
INSERT INTO site_settings (id, maintenance_mode) VALUES (1, false);

-- 7. Profiles (cache user display info)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT DEFAULT '',
  email TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  summary TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on all tables
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- JOBS: Everyone can read active jobs
CREATE POLICY "Anyone can read active jobs" ON jobs
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admin full access to jobs" ON jobs
  FOR ALL USING (
    auth.jwt() ->> 'email' = 'skillbridgeladder@gmail.com'
  );

-- APPLICATIONS: Users see own, Admin sees all
CREATE POLICY "Users see own applications" ON applications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own applications" ON applications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin full access to applications" ON applications
  FOR ALL USING (
    auth.jwt() ->> 'email' = 'skillbridgeladder@gmail.com'
  );

-- CHAT ROOMS: Users see own room, Admin sees all
CREATE POLICY "Users see own chat room" ON chat_rooms
  FOR SELECT USING (auth.uid() = freelancer_id);

CREATE POLICY "Admin full access to chat_rooms" ON chat_rooms
  FOR ALL USING (
    auth.jwt() ->> 'email' = 'skillbridgeladder@gmail.com'
  );

-- MESSAGES: Users see messages in own room
CREATE POLICY "Users see own room messages" ON messages
  FOR SELECT USING (
    room_id IN (SELECT id FROM chat_rooms WHERE freelancer_id = auth.uid())
  );

CREATE POLICY "Users can send messages in own room" ON messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    room_id IN (SELECT id FROM chat_rooms WHERE freelancer_id = auth.uid())
  );

CREATE POLICY "Admin full access to messages" ON messages
  FOR ALL USING (
    auth.jwt() ->> 'email' = 'skillbridgeladder@gmail.com'
  );

-- SITE SETTINGS: Everyone can read, Admin can update
CREATE POLICY "Anyone can read site settings" ON site_settings
  FOR SELECT USING (true);

CREATE POLICY "Admin can update site settings" ON site_settings
  FOR UPDATE USING (
    auth.jwt() ->> 'email' = 'skillbridgeladder@gmail.com'
  );

-- PROFILES: Users see own, Admin sees all
CREATE POLICY "Users see own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admin full access to profiles" ON profiles
  FOR ALL USING (
    auth.jwt() ->> 'email' = 'skillbridgeladder@gmail.com'
  );

-- ============================================
-- REALTIME (enable for live updates)
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE site_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE applications;

-- ============================================
-- FUNCTIONS
-- ============================================

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-create chat room on first application
CREATE OR REPLACE FUNCTION public.handle_new_application()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.chat_rooms (freelancer_id)
  VALUES (NEW.user_id)
  ON CONFLICT (freelancer_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_application_created
  AFTER INSERT ON applications
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_application();
