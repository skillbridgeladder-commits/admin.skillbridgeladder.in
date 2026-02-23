-- Fix Hire Portal Signup Error
-- Run this in Supabase SQL Editor

-- 1. Ensure current_session_slug exists
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_session_slug TEXT;

-- 2. Update handle_new_user to be more resilient
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    default_slug TEXT;
BEGIN
    default_slug := encode(gen_random_bytes(4), 'hex');
    
    INSERT INTO public.profiles (id, full_name, email, current_session_slug)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
        NEW.email,
        default_slug
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        email = EXCLUDED.email,
        current_session_slug = COALESCE(profiles.current_session_slug, EXCLUDED.current_session_slug);
        
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Fallback to basic insert if something goes wrong
    INSERT INTO public.profiles (id, full_name, email)
    VALUES (NEW.id, NEW.email, NEW.email)
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
