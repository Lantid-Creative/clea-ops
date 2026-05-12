
-- Client stage enum
CREATE TYPE public.client_stage AS ENUM ('Lead', 'KYC Submitted', 'KYC Review', 'Verified', 'Onboarded', 'Active');

CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL,
  contact_person TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  country TEXT NOT NULL DEFAULT '',
  industry TEXT NOT NULL DEFAULT '',
  assigned_specialist TEXT NOT NULL DEFAULT '',
  stage public.client_stage NOT NULL DEFAULT 'Lead',
  kyc_documents JSONB NOT NULL DEFAULT '{}'::jsonb,
  transaction_volume NUMERIC NOT NULL DEFAULT 0,
  onboard_date DATE,
  archived BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_clients_stage ON public.clients(stage);
CREATE INDEX idx_clients_archived ON public.clients(archived);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Helper: is the user allowed to edit clients (admin, or manager in customer_success / operations)
CREATE OR REPLACE FUNCTION public.can_edit_clients(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND is_active = true
      AND (
        role = 'admin'
        OR (role = 'manager' AND department IN ('customer_success','operations'))
      )
  )
$$;

-- All authenticated active users can view (UI further restricts via canView)
CREATE POLICY "Authenticated users can view clients"
ON public.clients FOR SELECT
TO authenticated
USING (public.is_user_active(auth.uid()));

CREATE POLICY "Editors can insert clients"
ON public.clients FOR INSERT
TO authenticated
WITH CHECK (public.can_edit_clients(auth.uid()));

CREATE POLICY "Editors can update clients"
ON public.clients FOR UPDATE
TO authenticated
USING (public.can_edit_clients(auth.uid()));

CREATE POLICY "Admins can delete clients"
ON public.clients FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_clients_updated_at
BEFORE UPDATE ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
