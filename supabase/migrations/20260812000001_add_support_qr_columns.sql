-- Add Support / Donation QR Code columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS support_qr_image TEXT,
ADD COLUMN IF NOT EXISTS support_title TEXT,
ADD COLUMN IF NOT EXISTS support_note TEXT,
ADD COLUMN IF NOT EXISTS support_qr_options JSONB;
