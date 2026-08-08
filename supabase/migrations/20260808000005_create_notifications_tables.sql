-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'announcement',
  url TEXT DEFAULT '/',
  status TEXT DEFAULT 'sent',
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create push_subscriptions table for browser device tokens
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT UNIQUE NOT NULL,
  keys JSONB,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS and permissive policies
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read notifications" ON public.notifications FOR SELECT USING (true);
CREATE POLICY "Allow all access to notifications" ON public.notifications FOR ALL USING (true);
CREATE POLICY "Allow public read subscriptions" ON public.push_subscriptions FOR SELECT USING (true);
CREATE POLICY "Allow all access to subscriptions" ON public.push_subscriptions FOR ALL USING (true);
