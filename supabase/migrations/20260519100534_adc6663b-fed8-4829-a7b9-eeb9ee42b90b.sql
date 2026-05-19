
DROP INDEX IF EXISTS public.clients_email_unique;
CREATE UNIQUE INDEX clients_email_unique ON public.clients (email);
