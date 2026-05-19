
-- Customer comments: collaborative notes left by team members on a customer
CREATE TABLE public.client_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  author_id uuid,
  author_name text NOT NULL DEFAULT '',
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_client_comments_client_id ON public.client_comments(client_id);
CREATE INDEX idx_client_comments_created_at ON public.client_comments(created_at DESC);

ALTER TABLE public.client_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active staff view client comments"
  ON public.client_comments FOR SELECT TO authenticated
  USING (public.is_user_active(auth.uid()));

CREATE POLICY "Editors insert client comments"
  ON public.client_comments FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_clients(auth.uid()) AND author_id = auth.uid());

CREATE POLICY "Authors or admins delete client comments"
  ON public.client_comments FOR DELETE TO authenticated
  USING (author_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
