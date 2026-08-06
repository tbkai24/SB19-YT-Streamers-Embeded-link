-- Migration: 20260806000000_admin_auth.sql
-- Description: Setup Admin Authentication table, policies, and auto-registration trigger in Supabase

-- 1. Ensure admins table exists and links to auth.users
CREATE TABLE IF NOT EXISTS public.admins (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'admin' CHECK (role IN ('superadmin', 'admin')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any to avoid duplication
DROP POLICY IF EXISTS "Admins can view admins" ON public.admins;
DROP POLICY IF EXISTS "Admins can manage admins" ON public.admins;

-- RLS Policies for Admin Access
CREATE POLICY "Admins can view admins" ON public.admins
    FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage admins" ON public.admins
    FOR ALL
    USING (auth.role() = 'authenticated');

-- 2. Trigger function to automatically register new Supabase Auth users into public.admins
CREATE OR REPLACE FUNCTION public.handle_new_admin_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.admins (id, email, role)
    VALUES (new.id, new.email, 'admin')
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger on auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created_admin ON auth.users;
CREATE TRIGGER on_auth_user_created_admin
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_admin_user();

-- 3. Populate existing users in auth.users into public.admins (if any already exist)
INSERT INTO public.admins (id, email, role)
SELECT id, email, 'admin'
FROM auth.users
ON CONFLICT (id) DO NOTHING;

