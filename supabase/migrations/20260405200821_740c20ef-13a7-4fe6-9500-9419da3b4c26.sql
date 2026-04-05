
-- Add department enum
CREATE TYPE public.app_department AS ENUM ('sales', 'marketing', 'customer_success', 'engineering', 'design', 'operations');

-- Add department to user_roles
ALTER TABLE public.user_roles ADD COLUMN department app_department;

-- Security definer function to get department
CREATE OR REPLACE FUNCTION public.get_user_department(_user_id UUID)
RETURNS app_department
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT department FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;
