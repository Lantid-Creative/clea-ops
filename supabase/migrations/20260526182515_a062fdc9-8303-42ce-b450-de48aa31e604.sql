-- Helpers used inside RLS USING/WITH CHECK expressions must be EXECUTE-able by the
-- invoking role. Re-grant EXECUTE to authenticated for all RLS helper functions.
GRANT EXECUTE ON FUNCTION public.is_user_active(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_edit_clients(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_edit_tickets(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_edit_projects(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_hr(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_department(uuid) TO authenticated;