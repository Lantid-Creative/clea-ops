-- Fix 1: Drop the older unrestricted INSERT policy on storage.objects so the MIME-allowlisted policy is authoritative.
DROP POLICY IF EXISTS "Editors upload ticket files" ON storage.objects;

-- Fix 2: Defence-in-depth for self-signup. New auth.users rows whose email is not @tryclea.com
-- are created as inactive staff, so they cannot read any data via RLS until an admin activates them.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));

  INSERT INTO public.user_roles (user_id, role, is_active)
  VALUES (
    NEW.id,
    'staff',
    COALESCE(NEW.email, '') ILIKE '%@tryclea.com'
  );

  RETURN NEW;
END;
$function$;