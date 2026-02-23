-- Ensure real-time updates include full row data
ALTER TABLE site_settings REPLICA IDENTITY FULL;
