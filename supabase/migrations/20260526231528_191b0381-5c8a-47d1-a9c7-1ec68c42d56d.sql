
CREATE TABLE IF NOT EXISTS public.payment_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid,
  exception_type text NOT NULL DEFAULT 'other',  -- failed_payout | stuck_transfer | fx_mismatch | refund | compliance_hold | other
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  reference text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'open',  -- open | in_progress | waiting | resolved | closed
  priority text NOT NULL DEFAULT 'medium', -- low | medium | high | urgent
  assigned_team public.app_department DEFAULT 'payments_ops',
  assignee_id uuid,
  resolution_note text NOT NULL DEFAULT '',
  resolved_at timestamptz,
  resolved_by uuid,
  created_by uuid,
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_exceptions TO authenticated;
GRANT ALL ON public.payment_exceptions TO service_role;
ALTER TABLE public.payment_exceptions ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_edit_payments(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND is_active = true
      AND (role IN ('admin','super_admin')
           OR (role IN ('manager','staff') AND department IN ('payments_ops','operations','support','finance')))
  )
$$;

CREATE POLICY "Active staff view payment exceptions"
ON public.payment_exceptions FOR SELECT TO authenticated
USING (public.is_user_active(auth.uid()));

CREATE POLICY "Editors insert payment exceptions"
ON public.payment_exceptions FOR INSERT TO authenticated
WITH CHECK (public.can_edit_payments(auth.uid()));

CREATE POLICY "Editors update payment exceptions"
ON public.payment_exceptions FOR UPDATE TO authenticated
USING (public.can_edit_payments(auth.uid()));

CREATE POLICY "Admins delete payment exceptions"
ON public.payment_exceptions FOR DELETE TO authenticated
USING (public.is_admin_or_super(auth.uid()));

CREATE TRIGGER trg_payment_exceptions_updated
BEFORE UPDATE ON public.payment_exceptions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Activity logging trigger for payment_exceptions (uses status field directly)
CREATE OR REPLACE FUNCTION public.log_payment_exception_changes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.activity_log(item_type, item_id, actor_id, action)
    VALUES ('payment_exception', NEW.id, auth.uid(), 'created');
    RETURN NEW;
  END IF;
  IF NEW.assigned_team IS DISTINCT FROM OLD.assigned_team OR NEW.assignee_id IS DISTINCT FROM OLD.assignee_id THEN
    INSERT INTO public.work_assignments(item_type, item_id, from_team, to_team, from_assignee, to_assignee, actor_id)
    VALUES ('payment_exception', NEW.id, OLD.assigned_team, NEW.assigned_team, OLD.assignee_id, NEW.assignee_id, auth.uid());
    INSERT INTO public.activity_log(item_type, item_id, actor_id, action, from_value, to_value)
    VALUES ('payment_exception', NEW.id, auth.uid(), 'assigned', COALESCE(OLD.assigned_team::text, OLD.assignee_id::text), COALESCE(NEW.assigned_team::text, NEW.assignee_id::text));
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.activity_log(item_type, item_id, actor_id, action, from_value, to_value)
    VALUES ('payment_exception', NEW.id, auth.uid(), 'status_changed', OLD.status, NEW.status);
    IF NEW.status IN ('resolved','closed') AND NEW.resolved_at IS NULL THEN
      NEW.resolved_at := now();
      NEW.resolved_by := auth.uid();
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_log_payment_exceptions
AFTER INSERT OR UPDATE ON public.payment_exceptions
FOR EACH ROW EXECUTE FUNCTION public.log_payment_exception_changes();
