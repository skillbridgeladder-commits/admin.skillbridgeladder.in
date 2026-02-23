-- Add current_session_slug to profiles to support session-based URL masking
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_session_slug TEXT;

-- Update the handle_new_user function to generate an initial slug (optional)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, current_session_slug)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    NEW.email,
    encode(gen_random_bytes(4), 'hex') -- Generate a random 8-char slug
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
