
-- Helper: combined admin check (admin OR super_admin)
CREATE OR REPLACE FUNCTION public.is_admin_or_super(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND is_active = true
      AND role IN ('admin','super_admin')
  )
$$;

-- Helper: super_admin check
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND is_active = true AND role = 'super_admin'
  )
$$;

-- 2. Add assigned_team + assignee_id to clients and project_tasks
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS assigned_team public.app_department,
  ADD COLUMN IF NOT EXISTS assignee_id uuid;

ALTER TABLE public.project_tasks
  ADD COLUMN IF NOT EXISTS assigned_team public.app_department;

-- 3. work_assignments table
CREATE TABLE IF NOT EXISTS public.work_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_type text NOT NULL,        -- 'client' | 'ticket' | 'project_task' | 'payment_exception'
  item_id uuid NOT NULL,
  from_team public.app_department,
  to_team public.app_department,
  from_assignee uuid,
  to_assignee uuid,
  actor_id uuid,
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.work_assignments TO authenticated;
GRANT ALL ON public.work_assignments TO service_role;
ALTER TABLE public.work_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active staff view assignments"
ON public.work_assignments FOR SELECT TO authenticated
USING (public.is_user_active(auth.uid()));

CREATE POLICY "Active staff insert assignments"
ON public.work_assignments FOR INSERT TO authenticated
WITH CHECK (public.is_user_active(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_work_assignments_item ON public.work_assignments(item_type, item_id, created_at DESC);

-- 4. activity_log table
CREATE TABLE IF NOT EXISTS public.activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_type text NOT NULL,
  item_id uuid NOT NULL,
  actor_id uuid,
  action text NOT NULL,           -- 'created' | 'status_changed' | 'assigned' | 'resolved' | ...
  from_value text,
  to_value text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.activity_log TO authenticated;
GRANT ALL ON public.activity_log TO service_role;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active staff view activity"
ON public.activity_log FOR SELECT TO authenticated
USING (public.is_user_active(auth.uid()));

CREATE POLICY "Active staff insert activity"
ON public.activity_log FOR INSERT TO authenticated
WITH CHECK (public.is_user_active(auth.uid()));

CREATE POLICY "Admins delete activity"
ON public.activity_log FOR DELETE TO authenticated
USING (public.is_admin_or_super(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_activity_log_item ON public.activity_log(item_type, item_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_actor ON public.activity_log(actor_id, created_at DESC);

-- 5. Generic logging triggers for clients, tickets, project_tasks
CREATE OR REPLACE FUNCTION public.log_work_item_changes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_type text := TG_ARGV[0];
  v_old_team public.app_department;
  v_new_team public.app_department;
  v_old_assignee uuid;
  v_new_assignee uuid;
  v_old_status text;
  v_new_status text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.activity_log(item_type, item_id, actor_id, action, to_value)
    VALUES (v_type, NEW.id, auth.uid(), 'created', NULL);
    RETURN NEW;
  END IF;

  -- UPDATE
  -- assigned_team
  EXECUTE format('SELECT ($1).%I, ($2).%I', 'assigned_team', 'assigned_team')
    INTO v_old_team, v_new_team USING OLD, NEW;
  -- assignee_id (project_tasks uses assignee_id too; clients now has it; tickets has assignee_id)
  BEGIN
    EXECUTE format('SELECT ($1).assignee_id, ($2).assignee_id') INTO v_old_assignee, v_new_assignee USING OLD, NEW;
  EXCEPTION WHEN undefined_column THEN
    v_old_assignee := NULL; v_new_assignee := NULL;
  END;
  -- status: tickets has status; clients has stage; project_tasks has column_name
  IF v_type = 'client' THEN
    EXECUTE 'SELECT ($1).stage::text, ($2).stage::text' INTO v_old_status, v_new_status USING OLD, NEW;
  ELSIF v_type = 'ticket' THEN
    EXECUTE 'SELECT ($1).status::text, ($2).status::text' INTO v_old_status, v_new_status USING OLD, NEW;
  ELSIF v_type = 'project_task' THEN
    EXECUTE 'SELECT ($1).column_name, ($2).column_name' INTO v_old_status, v_new_status USING OLD, NEW;
  END IF;

  IF v_old_team IS DISTINCT FROM v_new_team OR v_old_assignee IS DISTINCT FROM v_new_assignee THEN
    INSERT INTO public.work_assignments(item_type, item_id, from_team, to_team, from_assignee, to_assignee, actor_id)
    VALUES (v_type, NEW.id, v_old_team, v_new_team, v_old_assignee, v_new_assignee, auth.uid());
    INSERT INTO public.activity_log(item_type, item_id, actor_id, action, from_value, to_value)
    VALUES (v_type, NEW.id, auth.uid(), 'assigned', COALESCE(v_old_team::text, v_old_assignee::text), COALESCE(v_new_team::text, v_new_assignee::text));
  END IF;

  IF v_old_status IS DISTINCT FROM v_new_status THEN
    INSERT INTO public.activity_log(item_type, item_id, actor_id, action, from_value, to_value)
    VALUES (v_type, NEW.id, auth.uid(), 'status_changed', v_old_status, v_new_status);
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_log_clients ON public.clients;
CREATE TRIGGER trg_log_clients
AFTER INSERT OR UPDATE ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.log_work_item_changes('client');

DROP TRIGGER IF EXISTS trg_log_tickets ON public.tickets;
CREATE TRIGGER trg_log_tickets
AFTER INSERT OR UPDATE ON public.tickets
FOR EACH ROW EXECUTE FUNCTION public.log_work_item_changes('ticket');

DROP TRIGGER IF EXISTS trg_log_project_tasks ON public.project_tasks;
CREATE TRIGGER trg_log_project_tasks
AFTER INSERT OR UPDATE ON public.project_tasks
FOR EACH ROW EXECUTE FUNCTION public.log_work_item_changes('project_task');

-- 6. Update has_role to treat super_admin as admin everywhere admin is checked
-- (Keep has_role exact-match for explicit checks, but add convenience override)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND is_active = true
      AND (role = _role OR (_role = 'admin' AND role = 'super_admin'))
  )
$$;
