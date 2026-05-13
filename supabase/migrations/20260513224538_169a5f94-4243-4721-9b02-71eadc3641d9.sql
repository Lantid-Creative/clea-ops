
-- Enums
CREATE TYPE public.ticket_status AS ENUM ('open','in_progress','waiting_on_client','resolved','closed');
CREATE TYPE public.ticket_priority AS ENUM ('low','medium','high','urgent');
CREATE TYPE public.ticket_source AS ENUM ('staff','portal','crm_import','email');

-- Helper: who can edit tickets (admin or CS/Ops manager, must be active)
CREATE OR REPLACE FUNCTION public.can_edit_tickets(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
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

-- Tickets
CREATE TABLE public.tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number serial UNIQUE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'general',
  tags text[] NOT NULL DEFAULT '{}',
  status public.ticket_status NOT NULL DEFAULT 'open',
  priority public.ticket_priority NOT NULL DEFAULT 'medium',
  source public.ticket_source NOT NULL DEFAULT 'staff',
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  assignee_id uuid,
  requester_name text NOT NULL DEFAULT '',
  requester_email text NOT NULL DEFAULT '',
  due_date timestamptz,
  first_response_at timestamptz,
  resolved_at timestamptz,
  archived boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tickets_status ON public.tickets(status);
CREATE INDEX idx_tickets_assignee ON public.tickets(assignee_id);
CREATE INDEX idx_tickets_client ON public.tickets(client_id);
CREATE INDEX idx_tickets_created_at ON public.tickets(created_at DESC);

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active staff view tickets" ON public.tickets
  FOR SELECT TO authenticated USING (public.is_user_active(auth.uid()));

CREATE POLICY "Editors insert tickets" ON public.tickets
  FOR INSERT TO authenticated WITH CHECK (public.can_edit_tickets(auth.uid()));

CREATE POLICY "Anon portal submit" ON public.tickets
  FOR INSERT TO anon
  WITH CHECK (source = 'portal' AND status = 'open' AND archived = false);

CREATE POLICY "Editors update tickets" ON public.tickets
  FOR UPDATE TO authenticated USING (public.can_edit_tickets(auth.uid()));

CREATE POLICY "Admins delete tickets" ON public.tickets
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- updated_at trigger
CREATE TRIGGER trg_tickets_updated_at
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-stamp first_response_at / resolved_at
CREATE OR REPLACE FUNCTION public.tickets_status_stamps()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.first_response_at IS NULL AND NEW.status IN ('in_progress','waiting_on_client','resolved','closed') THEN
      NEW.first_response_at := now();
    END IF;
    IF NEW.resolved_at IS NULL AND NEW.status IN ('resolved','closed') THEN
      NEW.resolved_at := now();
    END IF;
    IF NEW.status NOT IN ('resolved','closed') THEN
      NEW.resolved_at := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_tickets_status_stamps
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.tickets_status_stamps();

-- Comments
CREATE TABLE public.ticket_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  author_id uuid,
  author_name text NOT NULL DEFAULT '',
  body text NOT NULL,
  is_internal boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ticket_comments_ticket ON public.ticket_comments(ticket_id, created_at);
ALTER TABLE public.ticket_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active staff view comments" ON public.ticket_comments
  FOR SELECT TO authenticated USING (public.is_user_active(auth.uid()));
CREATE POLICY "Editors insert comments" ON public.ticket_comments
  FOR INSERT TO authenticated WITH CHECK (public.can_edit_tickets(auth.uid()));
CREATE POLICY "Authors delete own comments" ON public.ticket_comments
  FOR DELETE TO authenticated USING (author_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- Attachments
CREATE TABLE public.ticket_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text,
  size_bytes bigint,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ticket_attachments_ticket ON public.ticket_attachments(ticket_id);
ALTER TABLE public.ticket_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active staff view attachments" ON public.ticket_attachments
  FOR SELECT TO authenticated USING (public.is_user_active(auth.uid()));
CREATE POLICY "Editors insert attachments" ON public.ticket_attachments
  FOR INSERT TO authenticated WITH CHECK (public.can_edit_tickets(auth.uid()));
CREATE POLICY "Editors delete attachments" ON public.ticket_attachments
  FOR DELETE TO authenticated USING (public.can_edit_tickets(auth.uid()));

-- Storage bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('ticket-attachments','ticket-attachments', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Active staff read ticket files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'ticket-attachments' AND public.is_user_active(auth.uid()));

CREATE POLICY "Editors upload ticket files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'ticket-attachments' AND public.can_edit_tickets(auth.uid()));

CREATE POLICY "Editors delete ticket files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'ticket-attachments' AND public.can_edit_tickets(auth.uid()));
