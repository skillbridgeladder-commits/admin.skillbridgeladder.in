-- Email Settings Enhancement
-- Run this in Supabase SQL Editor

ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS notification_email TEXT;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS email_threat_alerts BOOLEAN DEFAULT true;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS email_status_updates BOOLEAN DEFAULT true;

-- Ensure the row exists
INSERT INTO site_settings (id, maintenance_mode)
VALUES (1, false)
ON CONFLICT (id) DO NOTHING;

NOTIFY pgrst, 'reload schema';
