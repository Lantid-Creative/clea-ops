
-- 1. Restrict employees SELECT to HR/admins or own record
DROP POLICY IF EXISTS "Active staff view employees" ON public.employees;
CREATE POLICY "HR or self view employees"
ON public.employees FOR SELECT TO authenticated
USING (can_manage_hr(auth.uid()) OR user_id = auth.uid());

-- 2. Restrict internal ticket_comments visibility to ticket editors
DROP POLICY IF EXISTS "Active staff view comments" ON public.ticket_comments;
CREATE POLICY "View ticket comments"
ON public.ticket_comments FOR SELECT TO authenticated
USING (
  is_user_active(auth.uid())
  AND (is_internal = false OR can_edit_tickets(auth.uid()))
);

-- 3. Revoke EXECUTE on SECURITY DEFINER functions from anon/public
REVOKE EXECUTE ON FUNCTION public.kpi_sales(timestamptz, timestamptz) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.kpi_cs(timestamptz, timestamptz) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.kpi_finance(timestamptz, timestamptz) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.kpi_product(timestamptz, timestamptz) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.kpi_support(timestamptz, timestamptz) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.kpi_onboarding(timestamptz, timestamptz) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.kpi_compliance(timestamptz, timestamptz) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_user_active(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_admin_or_super(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_super_admin(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.can_edit_clients(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.can_edit_tickets(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.can_edit_payments(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.can_edit_projects(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.can_manage_hr(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_user_department(uuid) FROM anon, public;

-- 4. Set fixed search_path on the two IMMUTABLE routing functions (only ones missing it)
CREATE OR REPLACE FUNCTION public.route_ticket_team(_category text)
RETURNS app_department LANGUAGE sql IMMUTABLE SET search_path = public AS $$
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

CREATE OR REPLACE FUNCTION public.route_client_team(_stage client_stage)
RETURNS app_department LANGUAGE sql IMMUTABLE SET search_path = public AS $$
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
