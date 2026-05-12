-- Add is_active to user_roles
ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Audit log table
CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  action text NOT NULL,
  target_user_id uuid,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit log"
ON public.audit_log
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert audit log"
ON public.audit_log
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Trigger to log user_roles changes
CREATE OR REPLACE FUNCTION public.log_user_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      INSERT INTO public.audit_log (actor_id, action, target_user_id, details)
      VALUES (auth.uid(), 'role_changed', NEW.user_id,
        jsonb_build_object('from', OLD.role, 'to', NEW.role));
    END IF;
    IF NEW.department IS DISTINCT FROM OLD.department THEN
      INSERT INTO public.audit_log (actor_id, action, target_user_id, details)
      VALUES (auth.uid(), 'department_changed', NEW.user_id,
        jsonb_build_object('from', OLD.department, 'to', NEW.department));
    END IF;
    IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
      INSERT INTO public.audit_log (actor_id, action, target_user_id, details)
      VALUES (auth.uid(), CASE WHEN NEW.is_active THEN 'user_activated' ELSE 'user_deactivated' END,
        NEW.user_id, '{}'::jsonb);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS log_user_role_changes ON public.user_roles;
CREATE TRIGGER log_user_role_changes
AFTER UPDATE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.log_user_role_change();

-- Helper to check active status
CREATE OR REPLACE FUNCTION public.is_user_active(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT is_active FROM public.user_roles WHERE user_id = _user_id LIMIT 1), false)
$$;