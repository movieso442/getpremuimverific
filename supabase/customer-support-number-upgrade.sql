-- Run after the platform settings table exists. This changes public support contacts only.
UPDATE public.platform_settings
SET support_phone = '+237 640 796 062',
    whatsapp_number = '237640796062',
    updated_at = NOW()
WHERE id = TRUE;
