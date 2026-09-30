-- Premium Verify administrator settings upgrade
-- Run this once in Supabase SQL Editor before using the new Admin settings form.

CREATE TABLE IF NOT EXISTS public.platform_settings (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),
  support_email TEXT NOT NULL DEFAULT 'hello@premiumverific.com',
  support_phone TEXT NOT NULL DEFAULT '+237 680209047',
  whatsapp_number TEXT NOT NULL DEFAULT '237680209047',
  smm_markup_multiplier NUMERIC(5, 2) NOT NULL DEFAULT 3.00 CHECK (smm_markup_multiplier >= 1 AND smm_markup_multiplier <= 10),
  sms_markup_multiplier NUMERIC(5, 2) NOT NULL DEFAULT 3.00 CHECK (sms_markup_multiplier >= 1 AND sms_markup_multiplier <= 10),
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.platform_settings (id) VALUES (TRUE) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage platform settings" ON public.platform_settings;
CREATE POLICY "Admins can manage platform settings" ON public.platform_settings FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Ensure your own signed-in profile can access the administrator portal.
-- Replace this with the email you use to log into Premium Verify.
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'you@example.com';
