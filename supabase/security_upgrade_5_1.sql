-- Security Upgrade 5.1: Missing Columns & Hardening
-- Run this in Supabase SQL Editor

-- 1. Add missing columns to site_settings
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS whitelisted_ips TEXT[] DEFAULT '{}';
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS blacklisted_ips TEXT[] DEFAULT '{}';
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS blocked_countries TEXT[] DEFAULT '{}';
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS security_sensitivity FLOAT DEFAULT 0.5;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS captcha_enabled BOOLEAN DEFAULT false;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS bot_sensitivity FLOAT DEFAULT 0.5;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS notification_email TEXT;

-- 2. Add missing columns to security_audit_logs
ALTER TABLE security_audit_logs ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Unknown';
ALTER TABLE security_audit_logs ADD COLUMN IF NOT EXISTS resolution_status TEXT DEFAULT 'unresolved';

-- 3. Ensure RLS allows admin to update resolution_status
-- (The existing policy "Admin full access to security_audit_logs" should already cover this)

-- 4. Reload schema cache
NOTIFY pgrst, 'reload schema';
