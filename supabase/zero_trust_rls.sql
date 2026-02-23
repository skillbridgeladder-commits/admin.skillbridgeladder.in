-- Zero Trust Security Hardening: RLS Policies
-- This migration ensures that only the rightful owners and the verified admin can access sensitive data.

-- 1. Applications: Individual User Access + Admin Master Access
DROP POLICY IF EXISTS "Users see own applications" ON applications;
DROP POLICY IF EXISTS "Users can insert own applications" ON applications;
DROP POLICY IF EXISTS "Admin full access to applications" ON applications;

CREATE POLICY "Individual user access" ON applications
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Individual user insert" ON applications
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin master access" ON applications
FOR ALL USING (
  auth.jwt() ->> 'email' = 'skillbridgeladder@gmail.com' OR 
  auth.jwt() ->> 'email' = 'veer@yourdomain.com'
);

-- 2. Messages: participant-only access
DROP POLICY IF EXISTS "Users see own room messages" ON messages;
DROP POLICY IF EXISTS "Users can send messages in own room" ON messages;
DROP POLICY IF EXISTS "Admin full access to messages" ON messages;

CREATE POLICY "Participant message access" ON messages
FOR SELECT USING (
  auth.uid() = sender_id OR 
  room_id IN (SELECT id FROM chat_rooms WHERE freelancer_id = auth.uid())
);

CREATE POLICY "Participant message send" ON messages
FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Admin master message access" ON messages
FOR ALL USING (
  auth.jwt() ->> 'email' = 'skillbridgeladder@gmail.com' OR 
  auth.jwt() ->> 'email' = 'veer@yourdomain.com'
);

-- 3. Profiles: privacy hardening
DROP POLICY IF EXISTS "Users see own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admin full access to profiles" ON profiles;

CREATE POLICY "Self profile access" ON profiles
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Self profile update" ON profiles
FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admin master profile access" ON profiles
FOR ALL USING (
  auth.jwt() ->> 'email' = 'skillbridgeladder@gmail.com' OR 
  auth.jwt() ->> 'email' = 'veer@yourdomain.com'
);
