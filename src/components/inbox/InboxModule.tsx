import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Mail,
  RefreshCcw,
  Send,
  Trash2,
  Loader2,
  PenSquare,
  CheckCheck,
  ArrowLeft,
  Plug,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

type MessageSummary = {
  uid: string;
  subject: string;
  from: { name: string; address: string } | null;
  date: string | null;
  seen: boolean;
  flagged: boolean;
  size: number;
  message_id: string | null;
};

type FullMessage = {
  uid: string;
  subject: string;
  from: { name?: string; address: string } | null;
  to: { name?: string; address: string }[];
  cc: { name?: string; address: string }[];
  date: string | null;
  text: string;
  html: string | null;
  message_id: string | null;
  in_reply_to: string | null;
  references: string | string[] | null;
  attachments: { filename: string; contentType: string; size: number }[];
};

async function call(action: string, payload: Record<string, unknown> = {}) {
  const { data, error } = await supabase.functions.invoke('mailbox', {
    body: { action, ...payload },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data;
}

export function InboxModule() {
  const { toast } = useToast();
  const [status, setStatus] = useState<
    { connected: boolean; email_address: string | null } | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<MessageSummary[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [selected, setSelected] = useState<FullMessage | null>(null);
  const [loadingMsg, setLoadingMsg] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [folder] = useState('INBOX');

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const data = await call('status');
      setStatus(data);
    } catch (e) {
      toast({ title: 'Error', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const loadMessages = useCallback(async () => {
    setLoadingList(true);
    try {
      const data = await call('list_messages', { folder, limit: 30 });
      setMessages(data.messages ?? []);
    } catch (e) {
      toast({ title: 'Could not load mailbox', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setLoadingList(false);
    }
  }, [folder, toast]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    if (status?.connected) loadMessages();
  }, [status?.connected, loadMessages]);

  const openMessage = async (uid: string) => {
    setLoadingMsg(true);
    try {
      const data = await call('get_message', { folder, uid });
      setSelected(data);
      // Mark as read in background
      call('mark_read', { folder, uid }).then(() => {
        setMessages((prev) => prev.map((m) => (m.uid === uid ? { ...m, seen: true } : m)));
      }).catch(() => {});
    } catch (e) {
      toast({ title: 'Could not open message', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setLoadingMsg(false);
    }
  };

  const moveToTrash = async (uid: string) => {
    try {
      await call('move_to_trash', { folder, uid });
      setMessages((prev) => prev.filter((m) => m.uid !== uid));
      if (selected?.uid === uid) setSelected(null);
      toast({ title: 'Moved to trash' });
    } catch (e) {
      toast({ title: 'Failed', description: (e as Error).message, variant: 'destructive' });
    }
  };

  const disconnect = async () => {
    if (!confirm('Disconnect your mailbox? You will need to re-enter your password to reconnect.')) return;
    try {
      await call('disconnect');
      setStatus({ connected: false, email_address: null });
      setMessages([]);
      setSelected(null);
      toast({ title: 'Mailbox disconnected' });
    } catch (e) {
      toast({ title: 'Failed', description: (e as Error).message, variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading inbox...
      </div>
    );
  }

  if (!status?.connected) {
    return <ConnectMailbox onConnected={loadStatus} />;
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Mail className="h-5 w-5" /> Inbox
          </h2>
          <p className="text-xs text-muted-foreground">{status.email_address}</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={loadMessages} disabled={loadingList}>
            <RefreshCcw className={`h-4 w-4 mr-1 ${loadingList ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setComposeOpen(true)}>
            <PenSquare className="h-4 w-4 mr-1" /> Compose
          </Button>
          <Button size="sm" variant="ghost" onClick={disconnect}>
            <Plug className="h-4 w-4 mr-1" /> Disconnect
          </Button>
        </div>
      </div>

      {selected ? (
        <MessageView
          message={selected}
          onBack={() => setSelected(null)}
          onTrash={() => moveToTrash(selected.uid)}
          onReply={() => setComposeOpen(true)}
          replyDefaults={{
            to: selected.from?.address ?? '',
            subject: selected.subject?.startsWith('Re:') ? selected.subject : `Re: ${selected.subject}`,
            in_reply_to: selected.message_id ?? undefined,
            references: Array.isArray(selected.references)
              ? selected.references.join(' ')
              : selected.references ?? selected.message_id ?? undefined,
            quoted: selected.text,
          }}
          loadingMsg={loadingMsg}
        />
      ) : (
        <Card>
          {loadingList && messages.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Loader2 className="inline h-4 w-4 animate-spin mr-2" /> Loading messages...
            </div>
          ) : messages.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No messages.</div>
          ) : (
            <div className="divide-y">
              {messages.map((m) => (
                <button
                  key={m.uid}
                  onClick={() => openMessage(m.uid)}
                  className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors flex flex-col gap-1"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className={`text-sm truncate ${m.seen ? '' : 'font-semibold'}`}>
                      {m.from?.name || m.from?.address || '(unknown)'}
                    </span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {m.date ? formatDistanceToNow(new Date(m.date), { addSuffix: true }) : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {!m.seen && <Badge variant="default" className="h-4 px-1 text-[10px]">NEW</Badge>}
                    <span className={`text-sm truncate ${m.seen ? 'text-muted-foreground' : ''}`}>
                      {m.subject || '(no subject)'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>
      )}

      <ComposeDialog
        open={composeOpen}
        onOpenChange={setComposeOpen}
        onSent={() => {
          setComposeOpen(false);
          toast({ title: 'Message sent' });
        }}
        defaults={
          selected && composeOpen
            ? {
                to: selected.from?.address ?? '',
                subject: selected.subject?.startsWith('Re:')
                  ? selected.subject
                  : `Re: ${selected.subject}`,
                in_reply_to: selected.message_id ?? undefined,
                references: Array.isArray(selected.references)
                  ? selected.references.join(' ')
                  : selected.references ?? selected.message_id ?? undefined,
                quoted: selected.text,
              }
            : undefined
        }
      />
    </div>
  );
}

function ConnectMailbox({ onConnected }: { onConnected: () => void }) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    email_address: '',
    password: '',
    display_name: '',
    imap_host: 'imap.stackmail.com',
    imap_port: 993,
    smtp_host: 'smtp.stackmail.com',
    smtp_port: 465,
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await call('connect', form);
      toast({ title: 'Mailbox connected' });
      onConnected();
    } catch (err) {
      toast({
        title: 'Connection failed',
        description: (err as Error).message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-xl mx-auto">
      <Card className="p-6">
        <h2 className="text-xl font-semibold flex items-center gap-2 mb-1">
          <Mail className="h-5 w-5" /> Connect your Stackmail
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Sign in once with your Stackmail email and password. Your password is encrypted before storage and only used to connect to your mailbox.
        </p>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label htmlFor="email">Stackmail email address</Label>
            <Input
              id="email"
              type="email"
              required
              value={form.email_address}
              onChange={(e) => setForm({ ...form, email_address: e.target.value })}
              placeholder="you@yourdomain.com"
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="display_name">Display name (optional)</Label>
            <Input
              id="display_name"
              value={form.display_name}
              onChange={(e) => setForm({ ...form, display_name: e.target.value })}
              placeholder="Your name as shown to recipients"
            />
          </div>
          <details className="text-sm">
            <summary className="cursor-pointer text-muted-foreground">Advanced server settings</summary>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div><Label>IMAP host</Label><Input value={form.imap_host} onChange={(e) => setForm({ ...form, imap_host: e.target.value })} /></div>
              <div><Label>IMAP port</Label><Input type="number" value={form.imap_port} onChange={(e) => setForm({ ...form, imap_port: Number(e.target.value) })} /></div>
              <div><Label>SMTP host</Label><Input value={form.smtp_host} onChange={(e) => setForm({ ...form, smtp_host: e.target.value })} /></div>
              <div><Label>SMTP port</Label><Input type="number" value={form.smtp_port} onChange={(e) => setForm({ ...form, smtp_port: Number(e.target.value) })} /></div>
            </div>
          </details>
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Connect mailbox
          </Button>
        </form>
      </Card>
    </div>
  );
}

function MessageView({
  message,
  onBack,
  onTrash,
  onReply,
  loadingMsg,
}: {
  message: FullMessage;
  onBack: () => void;
  onTrash: () => void;
  onReply: () => void;
  replyDefaults: any;
  loadingMsg: boolean;
}) {
  return (
    <Card className="p-4 md:p-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onReply}>
            <Send className="h-4 w-4 mr-1" /> Reply
          </Button>
          <Button variant="outline" size="sm" onClick={onTrash}>
            <Trash2 className="h-4 w-4 mr-1" /> Trash
          </Button>
        </div>
      </div>
      {loadingMsg ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">{message.subject || '(no subject)'}</h3>
          <div className="text-sm text-muted-foreground">
            <div>
              <strong>From:</strong> {message.from?.name ? `${message.from.name} <${message.from.address}>` : message.from?.address}
            </div>
            <div>
              <strong>To:</strong> {message.to.map((t) => t.address).join(', ')}
            </div>
            {message.date && (
              <div>
                <strong>Date:</strong> {new Date(message.date).toLocaleString()}
              </div>
            )}
          </div>
          {message.attachments.length > 0 && (
            <div className="text-xs text-muted-foreground border-t pt-2">
              <CheckCheck className="inline h-3 w-3 mr-1" />
              {message.attachments.length} attachment(s):{' '}
              {message.attachments.map((a) => a.filename).join(', ')}
              <span className="ml-2 italic">(download not available yet)</span>
            </div>
          )}
          <div className="border-t pt-3">
            {message.html ? (
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: message.html }}
              />
            ) : (
              <pre className="whitespace-pre-wrap font-sans text-sm">{message.text}</pre>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

function ComposeDialog({
  open,
  onOpenChange,
  onSent,
  defaults,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSent: () => void;
  defaults?: {
    to?: string;
    subject?: string;
    in_reply_to?: string;
    references?: string;
    quoted?: string;
  };
}) {
  const { toast } = useToast();
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (open) {
      setTo(defaults?.to ?? '');
      setSubject(defaults?.subject ?? '');
      setText(defaults?.quoted ? `\n\n--- Original message ---\n${defaults.quoted}` : '');
    }
  }, [open, defaults]);

  const send = async () => {
    setSending(true);
    try {
      await call('send', {
        to,
        subject,
        text,
        in_reply_to: defaults?.in_reply_to,
        references: defaults?.references,
      });
      onSent();
    } catch (e) {
      toast({ title: 'Send failed', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>New message</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>To</Label>
            <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="recipient@example.com" />
          </div>
          <div>
            <Label>Subject</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div>
            <Label>Message</Label>
            <Textarea rows={10} value={text} onChange={(e) => setText(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={send} disabled={sending || !to || !subject}>
            {sending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            <Send className="h-4 w-4 mr-1" /> Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
