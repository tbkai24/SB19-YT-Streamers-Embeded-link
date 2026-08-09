-- Add profile_type column to profiles table ('embed' vs 'engagement')
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS profile_type TEXT DEFAULT 'embed';
