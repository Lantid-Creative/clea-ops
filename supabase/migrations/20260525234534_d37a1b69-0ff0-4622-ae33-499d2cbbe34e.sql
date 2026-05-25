
-- Revoke direct API access to helper/trigger SECURITY DEFINER functions.
-- These are only used inside RLS policies and triggers, never via RPC.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.is_user_active(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.can_edit_clients(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.can_edit_tickets(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.can_edit_projects(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.can_manage_hr(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.get_user_department(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.log_user_role_change() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.log_client_stage_change() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_stage_entered_at() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.tickets_status_stamps() FROM anon, authenticated, public;

-- KPI RPC functions: keep authenticated execute, revoke from anon.
REVOKE EXECUTE ON FUNCTION public.kpi_support(timestamptz, timestamptz) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.kpi_sales(timestamptz, timestamptz) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.kpi_cs(timestamptz, timestamptz) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.kpi_compliance(timestamptz, timestamptz) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.kpi_onboarding(timestamptz, timestamptz) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.kpi_product(timestamptz, timestamptz) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.kpi_finance(timestamptz, timestamptz) FROM anon, public;
