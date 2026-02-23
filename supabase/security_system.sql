-- SkillBridge Ladder — Advanced Security & Tracking
-- Run this in Supabase SQL Editor

-- 1. Track login sessions (Enables "Single Device Access")
CREATE TABLE IF NOT EXISTS login_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  last_active TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_login_sessions_user ON login_sessions(user_id);

-- 2. Audit logs for all subdomains
CREATE TABLE IF NOT EXISTS security_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  subdomain TEXT NOT NULL, -- 'admin', 'hire', 'tech', 'media'
  event_type TEXT NOT NULL, -- 'page_view', 'login', 'unauthorized_access'
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Update Site Settings with Kill Switch
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS firewall_active BOOLEAN DEFAULT false;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS allowed_admin_ips TEXT[] DEFAULT '{}';

-- 4. RLS for Security Tables
ALTER TABLE login_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_audit_logs ENABLE ROW LEVEL SECURITY;

-- Admin can see all logs
CREATE POLICY "Admin full access to login_sessions" ON login_sessions
  FOR ALL USING (auth.jwt() ->> 'email' = 'skillbridgeladder@gmail.com');

CREATE POLICY "Admin full access to security_audit_logs" ON security_audit_logs
  FOR ALL USING (auth.jwt() ->> 'email' = 'skillbridgeladder@gmail.com');

-- System can insert logs (even for guests)
CREATE POLICY "Anyone can insert audit logs" ON security_audit_logs
  FOR INSERT WITH CHECK (true);

-- Users see own sessions
CREATE POLICY "Users see own sessions" ON login_sessions
  FOR SELECT USING (auth.uid() = user_id);

-- 5. Force Schema Cache Reload
NOTIFY pgrst, 'reload schema';
