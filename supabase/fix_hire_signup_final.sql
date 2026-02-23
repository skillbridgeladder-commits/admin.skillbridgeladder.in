-- FINAL HIRE PORTAL FIX
-- Run this in Supabase SQL Editor

-- 1. Ensure profiles has the session slug column
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_session_slug TEXT;

-- 2. Make handle_new_user robust and inclusive of the slug
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, current_session_slug)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    NEW.email,
    encode(gen_random_bytes(4), 'hex')
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Last resort fallback
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, NEW.email, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Fix security_audit_logs RLS (Allow Guests to insert logs)
DROP POLICY IF EXISTS "Anyone can insert audit logs" ON security_audit_logs;
CREATE POLICY "Anyone can insert audit logs" ON security_audit_logs
  FOR INSERT WITH CHECK (true);

-- 4. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
