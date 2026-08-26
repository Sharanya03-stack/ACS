ALTER TABLE public.profiles ADD COLUMN notification_preferences JSONB DEFAULT '{"email": true, "sms": true, "system": false}'::jsonb;
