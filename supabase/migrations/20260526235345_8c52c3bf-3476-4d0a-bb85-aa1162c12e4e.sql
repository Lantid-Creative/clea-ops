CREATE TABLE public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  name text NOT NULL,
  role text NOT NULL DEFAULT '',
  department text NOT NULL DEFAULT 'Operations',
  employment_type text NOT NULL DEFAULT 'Full-time',
  email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  start_date date,
  education text NOT NULL DEFAULT '',
  state_of_origin text NOT NULL DEFAULT '',
  bank_name text NOT NULL DEFAULT '',
  account_number text NOT NULL DEFAULT '',
  emergency_contact_name text NOT NULL DEFAULT '',
  emergency_contact_relationship text NOT NULL DEFAULT '',
  emergency_contact_phone text NOT NULL DEFAULT '',
  archived boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.employees TO authenticated;
GRANT ALL ON public.employees TO service_role;

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active staff view employees"
ON public.employees FOR SELECT TO authenticated
USING (public.is_user_active(auth.uid()));

CREATE POLICY "HR insert employees"
ON public.employees FOR INSERT TO authenticated
WITH CHECK (public.can_manage_hr(auth.uid()));

CREATE POLICY "HR update employees"
ON public.employees FOR UPDATE TO authenticated
USING (public.can_manage_hr(auth.uid()));

CREATE POLICY "HR delete employees"
ON public.employees FOR DELETE TO authenticated
USING (public.can_manage_hr(auth.uid()));

CREATE TRIGGER employees_updated_at
BEFORE UPDATE ON public.employees
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();