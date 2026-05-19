
-- Stage history table
CREATE TABLE public.client_stage_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  from_stage client_stage,
  to_stage client_stage NOT NULL,
  changed_by uuid,
  changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_csh_client ON public.client_stage_history(client_id);
CREATE INDEX idx_csh_changed_at ON public.client_stage_history(changed_at);
CREATE INDEX idx_csh_to_stage ON public.client_stage_history(to_stage);

ALTER TABLE public.client_stage_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active staff view stage history"
  ON public.client_stage_history FOR SELECT TO authenticated
  USING (public.is_user_active(auth.uid()));

CREATE POLICY "Editors insert stage history"
  ON public.client_stage_history FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_clients(auth.uid()));

-- Trigger to log stage changes
CREATE OR REPLACE FUNCTION public.log_client_stage_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.client_stage_history (client_id, from_stage, to_stage, changed_by)
    VALUES (NEW.id, NULL, NEW.stage, auth.uid());
  ELSIF TG_OP = 'UPDATE' AND NEW.stage IS DISTINCT FROM OLD.stage THEN
    INSERT INTO public.client_stage_history (client_id, from_stage, to_stage, changed_by)
    VALUES (NEW.id, OLD.stage, NEW.stage, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS clients_stage_history_trg ON public.clients;
CREATE TRIGGER clients_stage_history_trg
AFTER INSERT OR UPDATE OF stage ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.log_client_stage_change();

-- Backfill: seed history with current stages so KPIs have data
INSERT INTO public.client_stage_history (client_id, from_stage, to_stage, changed_by, changed_at)
SELECT id, NULL, stage, created_by, created_at FROM public.clients
ON CONFLICT DO NOTHING;

-- ============ KPI FUNCTIONS ============

CREATE OR REPLACE FUNCTION public.kpi_support(p_from timestamptz, p_to timestamptz)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN NOT public.is_user_active(auth.uid()) THEN '{}'::jsonb ELSE
    jsonb_build_object(
      'tickets_opened', (SELECT count(*) FROM tickets WHERE created_at >= p_from AND created_at < p_to AND archived=false),
      'tickets_closed', (SELECT count(*) FROM tickets WHERE resolved_at >= p_from AND resolved_at < p_to AND status IN ('resolved','closed')),
      'open_backlog', (SELECT count(*) FROM tickets WHERE status IN ('open','in_progress','waiting_on_client') AND archived=false),
      'avg_first_response_minutes', (SELECT COALESCE(round(EXTRACT(EPOCH FROM avg(first_response_at - created_at))/60)::int, 0) FROM tickets WHERE first_response_at IS NOT NULL AND created_at >= p_from AND created_at < p_to),
      'avg_resolution_hours', (SELECT COALESCE(round(EXTRACT(EPOCH FROM avg(resolved_at - created_at))/3600)::int, 0) FROM tickets WHERE resolved_at IS NOT NULL AND resolved_at >= p_from AND resolved_at < p_to),
      'sla_breaches', (SELECT count(*) FROM tickets WHERE due_date IS NOT NULL AND due_date < now() AND status NOT IN ('resolved','closed') AND archived=false)
    )
  END
$$;

CREATE OR REPLACE FUNCTION public.kpi_sales(p_from timestamptz, p_to timestamptz)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN NOT public.is_user_active(auth.uid()) THEN '{}'::jsonb ELSE
    jsonb_build_object(
      'new_leads', (SELECT count(*) FROM clients WHERE created_at >= p_from AND created_at < p_to AND archived=false),
      'leads_contacted', (SELECT count(DISTINCT client_id) FROM client_stage_history WHERE from_stage='Lead' AND changed_at >= p_from AND changed_at < p_to),
      'converted_to_active', (SELECT count(DISTINCT client_id) FROM client_stage_history WHERE to_stage='Active' AND changed_at >= p_from AND changed_at < p_to),
      'conversion_rate_pct', (
        SELECT CASE WHEN leads.c > 0 THEN round((conv.c::numeric / leads.c) * 100, 1) ELSE 0 END
        FROM (SELECT count(*) c FROM clients WHERE created_at >= p_from AND created_at < p_to) leads,
             (SELECT count(DISTINCT client_id) c FROM client_stage_history WHERE to_stage='Active' AND changed_at >= p_from AND changed_at < p_to) conv
      ),
      'active_transacting', (SELECT count(*) FROM clients WHERE stage='Active' AND transaction_volume > 0 AND archived=false),
      'total_volume', (SELECT COALESCE(sum(transaction_volume), 0) FROM clients WHERE stage='Active' AND archived=false)
    )
  END
$$;

CREATE OR REPLACE FUNCTION public.kpi_compliance(p_from timestamptz, p_to timestamptz)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN NOT public.is_user_active(auth.uid()) THEN '{}'::jsonb ELSE
    jsonb_build_object(
      'kyc_submitted', (SELECT count(*) FROM client_stage_history WHERE to_stage='KYC Submitted' AND changed_at >= p_from AND changed_at < p_to),
      'kyc_verified', (SELECT count(*) FROM client_stage_history WHERE to_stage='Verified' AND changed_at >= p_from AND changed_at < p_to),
      'pending_review', (SELECT count(*) FROM clients WHERE stage IN ('KYC Submitted','KYC Review') AND archived=false),
      'avg_turnaround_hours', (
        SELECT COALESCE(round(EXTRACT(EPOCH FROM avg(v.changed_at - s.changed_at))/3600)::int, 0)
        FROM client_stage_history s
        JOIN client_stage_history v ON v.client_id = s.client_id AND v.to_stage='Verified' AND v.changed_at > s.changed_at
        WHERE s.to_stage='KYC Submitted' AND v.changed_at >= p_from AND v.changed_at < p_to
      )
    )
  END
$$;

CREATE OR REPLACE FUNCTION public.kpi_onboarding(p_from timestamptz, p_to timestamptz)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN NOT public.is_user_active(auth.uid()) THEN '{}'::jsonb ELSE
    jsonb_build_object(
      'onboarded', (SELECT count(*) FROM clients WHERE onboard_date >= p_from::date AND onboard_date < p_to::date AND archived=false),
      'avg_verified_to_onboarded_days', (
        SELECT COALESCE(round(EXTRACT(EPOCH FROM avg(o.changed_at - v.changed_at))/86400)::int, 0)
        FROM client_stage_history v
        JOIN client_stage_history o ON o.client_id = v.client_id AND o.to_stage='Onboarded' AND o.changed_at > v.changed_at
        WHERE v.to_stage='Verified' AND o.changed_at >= p_from AND o.changed_at < p_to
      ),
      'drop_offs', (
        SELECT count(*) FROM clients c
        WHERE c.stage='Verified' AND c.archived=false
          AND EXISTS (SELECT 1 FROM client_stage_history h WHERE h.client_id=c.id AND h.to_stage='Verified' AND h.changed_at < now() - interval '14 days')
      ),
      'queue_size', (SELECT count(*) FROM clients WHERE stage='Verified' AND archived=false)
    )
  END
$$;

CREATE OR REPLACE FUNCTION public.kpi_cs(p_from timestamptz, p_to timestamptz)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN NOT public.is_user_active(auth.uid()) THEN '{}'::jsonb ELSE
    jsonb_build_object(
      'engaged_this_period', (SELECT count(*) FROM clients WHERE last_contact_date >= p_from AND last_contact_date < p_to AND archived=false),
      'follow_ups_pending', (SELECT count(*) FROM clients WHERE follow_up_required = true AND archived=false),
      'churn_risk', (SELECT count(*) FROM clients WHERE stage='Active' AND archived=false AND (last_contact_date IS NULL OR last_contact_date < now() - interval '30 days')),
      'active_customers', (SELECT count(*) FROM clients WHERE stage='Active' AND archived=false)
    )
  END
$$;

CREATE OR REPLACE FUNCTION public.kpi_finance(p_from timestamptz, p_to timestamptz)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN NOT public.is_user_active(auth.uid()) THEN '{}'::jsonb ELSE
    jsonb_build_object(
      'total_volume', (SELECT COALESCE(sum(transaction_volume),0) FROM clients WHERE stage='Active' AND archived=false),
      'active_count', (SELECT count(*) FROM clients WHERE stage='Active' AND archived=false),
      'top_customers', (SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) FROM (
        SELECT company_name, transaction_volume FROM clients WHERE stage='Active' AND archived=false
        ORDER BY transaction_volume DESC LIMIT 10
      ) t)
    )
  END
$$;

CREATE OR REPLACE FUNCTION public.kpi_product(p_from timestamptz, p_to timestamptz)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN NOT public.is_user_active(auth.uid()) THEN '{}'::jsonb ELSE
    jsonb_build_object(
      'bugs_opened', (SELECT count(*) FROM tickets WHERE category IN ('bug','engineering') AND created_at >= p_from AND created_at < p_to AND archived=false),
      'bugs_closed', (SELECT count(*) FROM tickets WHERE category IN ('bug','engineering') AND resolved_at >= p_from AND resolved_at < p_to AND status IN ('resolved','closed')),
      'open_bugs', (SELECT count(*) FROM tickets WHERE category IN ('bug','engineering') AND status NOT IN ('resolved','closed') AND archived=false),
      'features_requested', (SELECT count(*) FROM tickets WHERE category='feature' AND created_at >= p_from AND created_at < p_to AND archived=false)
    )
  END
$$;
