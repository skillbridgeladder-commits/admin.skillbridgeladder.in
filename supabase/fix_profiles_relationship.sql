-- Fix relationship between applications and profiles for the CRM Dashboard
-- This ensures PostgREST can resolve the 'profiles' join

-- 1. Ensure id column in profiles is the primary key and matches auth.users
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_id_fkey 
FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Ensure application user_id is properly linked to profiles
ALTER TABLE public.applications
DROP CONSTRAINT IF EXISTS applications_user_id_fkey;

ALTER TABLE public.applications
ADD CONSTRAINT applications_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 3. Verify RLS (Zero Trust)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view all profiles" ON public.profiles
FOR SELECT USING (auth.jwt() ->> 'email' = 'skillbridgeladder@gmail.com');

COMMENT ON CONSTRAINT applications_user_id_fkey ON public.applications IS 'Enables joined queries between applications and candidate profiles';
