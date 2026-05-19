-- Allow staff (not only managers/admins) to edit within their mapped departments.
CREATE OR REPLACE FUNCTION public.can_edit_clients(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND is_active = true
      AND (
        role = 'admin'
        OR (role IN ('manager','staff') AND department IN (
          'support','onboarding','sales','customer_success','operations'
        ))
        -- Compliance is read-only on clients per policy: excluded intentionally.
      )
  )
$function$;

CREATE OR REPLACE FUNCTION public.can_edit_tickets(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND is_active = true
      AND (
        role = 'admin'
        OR (role IN ('manager','staff') AND department IN (
          'support','product_dev','customer_success','engineering','operations'
        ))
      )
  )
$function$;