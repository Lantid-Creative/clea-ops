CREATE OR REPLACE FUNCTION public.can_edit_clients(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND is_active = true
      AND (
        role = 'admin'
        OR (role = 'manager' AND department IN (
          'support','onboarding','sales','compliance','customer_success','operations'
        ))
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.can_edit_tickets(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND is_active = true
      AND (
        role = 'admin'
        OR (role = 'manager' AND department IN (
          'support','product_dev','customer_success','engineering','operations'
        ))
      )
  )
$$;