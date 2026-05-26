
-- 1. Add assigned_team to tickets
ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS assigned_team public.app_department;

-- 2. Routing helpers
CREATE OR REPLACE FUNCTION public.route_client_team(_stage public.client_stage)
RETURNS public.app_department LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE _stage
    WHEN 'Lead' THEN 'sales'::public.app_department
    WHEN 'KYC Submitted' THEN 'compliance'::public.app_department
    WHEN 'KYC Review' THEN 'compliance'::public.app_department
    WHEN 'Verified' THEN 'onboarding'::public.app_department
    WHEN 'Onboarded' THEN 'customer_success'::public.app_department
    WHEN 'Active' THEN 'customer_success'::public.app_department
    ELSE 'operations'::public.app_department
  END
$$;

CREATE OR REPLACE FUNCTION public.route_ticket_team(_category text)
RETURNS public.app_department LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE lower(coalesce(_category,'general'))
    WHEN 'bug' THEN 'product_dev'::public.app_department
    WHEN 'engineering' THEN 'product_dev'::public.app_department
    WHEN 'feature' THEN 'product_dev'::public.app_department
    WHEN 'billing' THEN 'finance'::public.app_department
    WHEN 'payments' THEN 'payments_ops'::public.app_department
    WHEN 'payment' THEN 'payments_ops'::public.app_department
    WHEN 'compliance' THEN 'compliance'::public.app_department
    WHEN 'onboarding' THEN 'onboarding'::public.app_department
    WHEN 'sales' THEN 'sales'::public.app_department
    ELSE 'support'::public.app_department
  END
$$;

-- 3. Auto-route triggers
CREATE OR REPLACE FUNCTION public.autoroute_client()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.assigned_team IS NULL THEN
      NEW.assigned_team := public.route_client_team(NEW.stage);
    END IF;
  ELSIF TG_OP = 'UPDATE' AND NEW.stage IS DISTINCT FROM OLD.stage THEN
    -- only auto-reroute if team hasn't been manually overridden away from previous stage's default
    IF OLD.assigned_team IS NULL OR OLD.assigned_team = public.route_client_team(OLD.stage) THEN
      NEW.assigned_team := public.route_client_team(NEW.stage);
      NEW.assignee_id := NULL; -- new team picks it up
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_autoroute_client ON public.clients;
CREATE TRIGGER trg_autoroute_client
  BEFORE INSERT OR UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.autoroute_client();

CREATE OR REPLACE FUNCTION public.autoroute_ticket()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.assigned_team IS NULL THEN
    NEW.assigned_team := public.route_ticket_team(NEW.category);
  ELSIF TG_OP = 'UPDATE' AND NEW.category IS DISTINCT FROM OLD.category THEN
    IF OLD.assigned_team IS NULL OR OLD.assigned_team = public.route_ticket_team(OLD.category) THEN
      NEW.assigned_team := public.route_ticket_team(NEW.category);
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_autoroute_ticket ON public.tickets;
CREATE TRIGGER trg_autoroute_ticket
  BEFORE INSERT OR UPDATE ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.autoroute_ticket();

CREATE OR REPLACE FUNCTION public.autoroute_project_task()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.assigned_team IS NULL THEN
    NEW.assigned_team := COALESCE(public.get_user_department(auth.uid()), 'product_dev'::public.app_department);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_autoroute_project_task ON public.project_tasks;
CREATE TRIGGER trg_autoroute_project_task
  BEFORE INSERT ON public.project_tasks
  FOR EACH ROW EXECUTE FUNCTION public.autoroute_project_task();
