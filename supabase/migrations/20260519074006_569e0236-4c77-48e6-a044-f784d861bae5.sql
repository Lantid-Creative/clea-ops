-- Add new department values (Postgres requires each in its own statement)
ALTER TYPE public.app_department ADD VALUE IF NOT EXISTS 'support';
ALTER TYPE public.app_department ADD VALUE IF NOT EXISTS 'onboarding';
ALTER TYPE public.app_department ADD VALUE IF NOT EXISTS 'compliance';
ALTER TYPE public.app_department ADD VALUE IF NOT EXISTS 'finance';
ALTER TYPE public.app_department ADD VALUE IF NOT EXISTS 'hr';
ALTER TYPE public.app_department ADD VALUE IF NOT EXISTS 'product_dev';