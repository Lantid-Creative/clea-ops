-- Per-user mailbox credentials (encrypted at rest)
CREATE TABLE public.email_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  email_address text NOT NULL,
  display_name text NOT NULL DEFAULT '',
  imap_host text NOT NULL DEFAULT 'imap.stackmail.com',
  imap_port integer NOT NULL DEFAULT 993,
  smtp_host text NOT NULL DEFAULT 'smtp.stackmail.com',
  smtp_port integer NOT NULL DEFAULT 465,
  password_ciphertext text NOT NULL,
  password_iv text NOT NULL,
  password_tag text NOT NULL,
  last_verified_at timestamptz,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own mailbox"
  ON public.email_accounts FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users insert own mailbox"
  ON public.email_accounts FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own mailbox"
  ON public.email_accounts FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users delete own mailbox"
  ON public.email_accounts FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE TRIGGER email_accounts_updated_at
  BEFORE UPDATE ON public.email_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Link emails to tickets (uid = IMAP UID + folder + account)
CREATE TABLE public.email_message_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL,
  account_id uuid NOT NULL REFERENCES public.email_accounts(id) ON DELETE CASCADE,
  folder text NOT NULL DEFAULT 'INBOX',
  message_uid text NOT NULL,
  subject text NOT NULL DEFAULT '',
  from_address text NOT NULL DEFAULT '',
  message_date timestamptz,
  linked_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ticket_id, account_id, folder, message_uid)
);

ALTER TABLE public.email_message_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active staff view email links"
  ON public.email_message_links FOR SELECT TO authenticated
  USING (public.is_user_active(auth.uid()));

CREATE POLICY "Editors insert email links"
  ON public.email_message_links FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_tickets(auth.uid()));

CREATE POLICY "Editors delete email links"
  ON public.email_message_links FOR DELETE TO authenticated
  USING (public.can_edit_tickets(auth.uid()));

CREATE INDEX email_message_links_ticket_idx ON public.email_message_links(ticket_id);