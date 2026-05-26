
-- 1. Add super_admin role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';

-- 2. Add payments_ops department
ALTER TYPE public.app_department ADD VALUE IF NOT EXISTS 'payments_ops';
