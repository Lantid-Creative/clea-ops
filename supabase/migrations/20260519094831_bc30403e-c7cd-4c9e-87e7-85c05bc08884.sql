
REVOKE EXECUTE ON FUNCTION public.kpi_support(timestamptz, timestamptz) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.kpi_sales(timestamptz, timestamptz) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.kpi_compliance(timestamptz, timestamptz) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.kpi_onboarding(timestamptz, timestamptz) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.kpi_cs(timestamptz, timestamptz) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.kpi_finance(timestamptz, timestamptz) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.kpi_product(timestamptz, timestamptz) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.log_client_stage_change() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.kpi_support(timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.kpi_sales(timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.kpi_compliance(timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.kpi_onboarding(timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.kpi_cs(timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.kpi_finance(timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.kpi_product(timestamptz, timestamptz) TO authenticated;
