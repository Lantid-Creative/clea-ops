
-- 1. Add stage tracking + closure fields to clients
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS stage_entered_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS won_lost_reason text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS closed_at timestamptz;

CREATE OR REPLACE FUNCTION public.update_stage_entered_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.stage IS DISTINCT FROM OLD.stage THEN
    NEW.stage_entered_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS clients_stage_entered_at ON public.clients;
CREATE TRIGGER clients_stage_entered_at
BEFORE UPDATE ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.update_stage_entered_at();

-- 2. KYC checklist items
CREATE TABLE IF NOT EXISTS public.kyc_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  doc_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending | submitted | approved | rejected
  file_url text,
  reviewer_id uuid,
  reviewer_name text NOT NULL DEFAULT '',
  reviewed_at timestamptz,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.kyc_checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active staff view kyc items"
ON public.kyc_checklist_items FOR SELECT TO authenticated
USING (public.is_user_active(auth.uid()));

CREATE POLICY "Compliance and editors insert kyc"
ON public.kyc_checklist_items FOR INSERT TO authenticated
WITH CHECK (
  public.is_user_active(auth.uid()) AND (
    public.has_role(auth.uid(), 'admin') OR
    public.get_user_department(auth.uid()) IN ('compliance','onboarding','operations')
    OR public.can_edit_clients(auth.uid())
  )
);

CREATE POLICY "Compliance and editors update kyc"
ON public.kyc_checklist_items FOR UPDATE TO authenticated
USING (
  public.is_user_active(auth.uid()) AND (
    public.has_role(auth.uid(), 'admin') OR
    public.get_user_department(auth.uid()) IN ('compliance','onboarding','operations')
    OR public.can_edit_clients(auth.uid())
  )
);

CREATE POLICY "Admins delete kyc"
ON public.kyc_checklist_items FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER kyc_items_updated_at
BEFORE UPDATE ON public.kyc_checklist_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS kyc_items_client_idx ON public.kyc_checklist_items(client_id);

-- 3. Project tasks
CREATE TABLE IF NOT EXISTS public.project_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  column_name text NOT NULL DEFAULT 'To Do',
  assignee text NOT NULL DEFAULT '',
  assignee_id uuid,
  priority text NOT NULL DEFAULT 'Medium',
  labels text[] NOT NULL DEFAULT '{}',
  due_date date,
  archived boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_edit_projects(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND is_active = true
      AND (role = 'admin' OR (role IN ('manager','staff') AND department IN ('product_dev','engineering','design','operations')))
  )
$$;

CREATE POLICY "Active staff view project tasks"
ON public.project_tasks FOR SELECT TO authenticated
USING (public.is_user_active(auth.uid()));

CREATE POLICY "Editors insert project tasks"
ON public.project_tasks FOR INSERT TO authenticated
WITH CHECK (public.can_edit_projects(auth.uid()));

CREATE POLICY "Editors update project tasks"
ON public.project_tasks FOR UPDATE TO authenticated
USING (public.can_edit_projects(auth.uid()));

CREATE POLICY "Editors delete project tasks"
ON public.project_tasks FOR DELETE TO authenticated
USING (public.can_edit_projects(auth.uid()));

CREATE TRIGGER project_tasks_updated_at
BEFORE UPDATE ON public.project_tasks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Leave requests
CREATE TABLE IF NOT EXISTS public.leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  requester_name text NOT NULL DEFAULT '',
  leave_type text NOT NULL DEFAULT 'Annual', -- Annual | Sick | Unpaid | Other
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  approver_id uuid,
  approver_name text NOT NULL DEFAULT '',
  decided_at timestamptz,
  decision_note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_manage_hr(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND is_active = true
      AND (role = 'admin' OR (role IN ('manager','staff') AND department IN ('hr','operations')))
  )
$$;

CREATE POLICY "View own or manage hr leave"
ON public.leave_requests FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.can_manage_hr(auth.uid()));

CREATE POLICY "Active staff create own leave"
ON public.leave_requests FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND public.is_user_active(auth.uid()));

CREATE POLICY "HR or own pending update leave"
ON public.leave_requests FOR UPDATE TO authenticated
USING (public.can_manage_hr(auth.uid()) OR (user_id = auth.uid() AND status = 'pending'));

CREATE POLICY "HR or own delete leave"
ON public.leave_requests FOR DELETE TO authenticated
USING (public.can_manage_hr(auth.uid()) OR (user_id = auth.uid() AND status = 'pending'));

CREATE TRIGGER leave_requests_updated_at
BEFORE UPDATE ON public.leave_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. HR onboarding tasks
CREATE TABLE IF NOT EXISTS public.hr_onboarding_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  employee_name text NOT NULL DEFAULT '',
  title text NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending | done
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.hr_onboarding_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own or hr onboarding"
ON public.hr_onboarding_tasks FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.can_manage_hr(auth.uid()));

CREATE POLICY "HR insert onboarding"
ON public.hr_onboarding_tasks FOR INSERT TO authenticated
WITH CHECK (public.can_manage_hr(auth.uid()));

CREATE POLICY "HR or own update onboarding"
ON public.hr_onboarding_tasks FOR UPDATE TO authenticated
USING (public.can_manage_hr(auth.uid()) OR user_id = auth.uid());

CREATE POLICY "HR delete onboarding"
ON public.hr_onboarding_tasks FOR DELETE TO authenticated
USING (public.can_manage_hr(auth.uid()));

CREATE TRIGGER hr_onboarding_tasks_updated_at
BEFORE UPDATE ON public.hr_onboarding_tasks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
