
-- 1. Update has_role to check is_active
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role AND is_active = true
  )
$function$;

-- 2. Explicitly block non-admins from inserting/updating their own user_roles rows.
-- The existing "Admins can manage all roles" (ALL) policy permits admins; add restrictive policies
-- so non-admins can never self-escalate even if a permissive policy is later added.
CREATE POLICY "Only admins can insert roles"
ON public.user_roles
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update roles"
ON public.user_roles
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete roles"
ON public.user_roles
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 3. Add explicit UPDATE policy on storage.objects for ticket-attachments bucket
CREATE POLICY "Editors update ticket attachments"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'ticket-attachments' AND public.can_edit_tickets(auth.uid()))
WITH CHECK (bucket_id = 'ticket-attachments' AND public.can_edit_tickets(auth.uid()));
