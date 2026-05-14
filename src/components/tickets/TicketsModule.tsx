import { useEffect, useMemo, useRef, useState } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Search, Plus, Ticket as TicketIcon, AlertCircle, CheckCircle2, Clock, Download, Upload, Paperclip, MessageSquare, Trash2, Archive, ArchiveRestore } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatCard } from '@/components/layout/StatCard';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

type TicketStatus = 'open' | 'in_progress' | 'waiting_on_client' | 'resolved' | 'closed';
type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
type TicketSource = 'staff' | 'portal' | 'crm_import' | 'email';

const STATUSES: TicketStatus[] = ['open', 'in_progress', 'waiting_on_client', 'resolved', 'closed'];
const PRIORITIES: TicketPriority[] = ['low', 'medium', 'high', 'urgent'];
const CATEGORIES = ['general', 'kyc', 'payments', 'onboarding', 'technical', 'billing', 'other'];

interface Ticket {
  id: string;
  ticket_number: number;
  title: string;
  description: string;
  category: string;
  tags: string[];
  status: TicketStatus;
  priority: TicketPriority;
  source: TicketSource;
  client_id: string | null;
  assignee_id: string | null;
  requester_name: string;
  requester_email: string;
  due_date: string | null;
  first_response_at: string | null;
  resolved_at: string | null;
  archived: boolean;
  created_at: string;
  updated_at: string;
}

interface Comment {
  id: string;
  ticket_id: string;
  author_name: string;
  body: string;
  is_internal: boolean;
  created_at: string;
}

interface Attachment {
  id: string;
  storage_path: string;
  file_name: string;
  size_bytes: number | null;
  created_at: string;
}

interface ClientLite { id: string; company_name: string }
interface ProfileLite { user_id: string; full_name: string | null }

const statusLabel: Record<TicketStatus, string> = {
  open: 'Open',
  in_progress: 'In progress',
  waiting_on_client: 'Waiting on client',
  resolved: 'Resolved',
  closed: 'Closed',
};

const statusColor: Record<TicketStatus, string> = {
  open: 'bg-primary/10 text-primary',
  in_progress: 'bg-warning/10 text-warning',
  waiting_on_client: 'bg-muted text-muted-foreground',
  resolved: 'bg-success/10 text-success',
  closed: 'bg-muted text-muted-foreground',
};

const priorityColor: Record<TicketPriority, string> = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-primary/10 text-primary',
  high: 'bg-warning/10 text-warning',
  urgent: 'bg-destructive/10 text-destructive',
};

const emptyForm = {
  title: '',
  description: '',
  category: 'general',
  priority: 'medium' as TicketPriority,
  client_id: '',
  assignee_id: '',
  requester_name: '',
  requester_email: '',
  due_date: '',
  tags: '',
};

export function TicketsModule({ canEdit = true }: { canEdit?: boolean }) {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [clients, setClients] = useState<ClientLite[]>([]);
  const [profiles, setProfiles] = useState<ProfileLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | 'all'>('all');
  const [showArchived, setShowArchived] = useState(false);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [importOpen, setImportOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: ts }, { data: cs }, { data: ps }] = await Promise.all([
      supabase.from('tickets').select('*').order('created_at', { ascending: false }),
      supabase.from('clients').select('id, company_name').eq('archived', false).order('company_name'),
      supabase.from('profiles').select('user_id, full_name'),
    ]);
    setTickets((ts ?? []) as Ticket[]);
    setClients((cs ?? []) as ClientLite[]);
    setProfiles((ps ?? []) as ProfileLite[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const loadDetail = async (t: Ticket) => {
    setSelected(t);
    const [{ data: cm }, { data: at }] = await Promise.all([
      supabase.from('ticket_comments').select('*').eq('ticket_id', t.id).order('created_at'),
      supabase.from('ticket_attachments').select('*').eq('ticket_id', t.id).order('created_at'),
    ]);
    setComments((cm ?? []) as Comment[]);
    setAttachments((at ?? []) as Attachment[]);
  };

  const filtered = useMemo(() => tickets.filter((t) => {
    if (t.archived !== showArchived) return false;
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!t.title.toLowerCase().includes(s) &&
          !t.description.toLowerCase().includes(s) &&
          !String(t.ticket_number).includes(s) &&
          !t.requester_email.toLowerCase().includes(s)) return false;
    }
    return true;
  }), [tickets, search, statusFilter, priorityFilter, showArchived]);

  const stats = useMemo(() => {
    const live = tickets.filter((t) => !t.archived);
    return {
      total: live.length,
      open: live.filter((t) => t.status === 'open' || t.status === 'in_progress').length,
      urgent: live.filter((t) => t.priority === 'urgent' && t.status !== 'resolved' && t.status !== 'closed').length,
      resolved: live.filter((t) => t.status === 'resolved' || t.status === 'closed').length,
    };
  }, [tickets]);

  const submitForm = async () => {
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    const payload: any = {
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category,
      priority: form.priority,
      source: 'staff',
      client_id: form.client_id || null,
      assignee_id: form.assignee_id || null,
      requester_name: form.requester_name.trim(),
      requester_email: form.requester_email.trim(),
      due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
      tags: form.tags.split(',').map((s) => s.trim()).filter(Boolean),
      created_by: user?.id ?? null,
    };
    const { error } = await supabase.from('tickets').insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success('Ticket created');
    setFormOpen(false);
    setForm(emptyForm);
    load();
  };

  const updateField = async (id: string, patch: Partial<Ticket>) => {
    const { error } = await supabase.from('tickets').update(patch).eq('id', id);
    if (error) { toast.error(error.message); return; }
    setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    if (selected?.id === id) setSelected({ ...selected, ...patch } as Ticket);
  };

  const toggleArchive = async (t: Ticket) => {
    await updateField(t.id, { archived: !t.archived });
    toast.success(t.archived ? 'Restored' : 'Archived');
  };

  const addComment = async () => {
    if (!selected || !newComment.trim()) return;
    const me = profiles.find((p) => p.user_id === user?.id);
    const { data, error } = await supabase
      .from('ticket_comments')
      .insert({
        ticket_id: selected.id,
        author_id: user?.id ?? null,
        author_name: me?.full_name ?? user?.email ?? 'Staff',
        body: newComment.trim(),
        is_internal: true,
      })
      .select()
      .single();
    if (error) { toast.error(error.message); return; }
    setComments((c) => [...c, data as Comment]);
    setNewComment('');
  };

  const uploadFiles = async (files: FileList | null) => {
    if (!selected || !files || !files.length) return;
    for (const f of Array.from(files)) {
      const path = `${selected.id}/${Date.now()}-${f.name}`;
      const up = await supabase.storage.from('ticket-attachments').upload(path, f);
      if (up.error) { toast.error(up.error.message); continue; }
      const { data, error } = await supabase
        .from('ticket_attachments')
        .insert({
          ticket_id: selected.id,
          storage_path: path,
          file_name: f.name,
          mime_type: f.type,
          size_bytes: f.size,
          uploaded_by: user?.id ?? null,
        })
        .select()
        .single();
      if (error) { toast.error(error.message); continue; }
      setAttachments((a) => [...a, data as Attachment]);
    }
    toast.success('Uploaded');
  };

  const downloadAttachment = async (a: Attachment) => {
    const { data, error } = await supabase.storage
      .from('ticket-attachments')
      .createSignedUrl(a.storage_path, 60);
    if (error || !data) { toast.error('Could not generate link'); return; }
    window.open(data.signedUrl, '_blank');
  };

  const exportCSV = () => {
    const header = ['ticket_number','title','status','priority','category','source','client','assignee','requester_name','requester_email','due_date','created_at','first_response_at','resolved_at','tags'];
    const rows = filtered.map((t) => [
      t.ticket_number,
      t.title,
      t.status,
      t.priority,
      t.category,
      t.source,
      clients.find((c) => c.id === t.client_id)?.company_name ?? '',
      profiles.find((p) => p.user_id === t.assignee_id)?.full_name ?? '',
      t.requester_name,
      t.requester_email,
      t.due_date ?? '',
      t.created_at,
      t.first_response_at ?? '',
      t.resolved_at ?? '',
      t.tags.join('|'),
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tickets-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard title="Total tickets" value={String(stats.total)} icon={<TicketIcon className="h-4 w-4" />} />
        <StatCard title="Open / in progress" value={String(stats.open)} icon={<Clock className="h-4 w-4" />} />
        <StatCard title="Urgent" value={String(stats.urgent)} icon={<AlertCircle className="h-4 w-4" />} />
        <StatCard title="Resolved" value={String(stats.resolved)} icon={<CheckCircle2 className="h-4 w-4" />} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tickets" className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{statusLabel[s]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as any)}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            {PRIORITIES.map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => setShowArchived((v) => !v)}>
          {showArchived ? 'Show active' : 'Show archived'}
        </Button>
        <Button variant="outline" size="sm" onClick={exportCSV}><Download className="h-4 w-4" /> CSV</Button>
        {canEdit && (
          <Button size="sm" onClick={() => { setForm(emptyForm); setFormOpen(true); }}>
            <Plus className="h-4 w-4" /> New ticket
          </Button>
        )}
      </div>

      <div className="rounded-lg border bg-card">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No tickets found.</div>
        ) : (
          <div className="divide-y">
            {filtered.map((t) => (
              <button
                key={t.id}
                onClick={() => loadDetail(t)}
                className="block w-full px-4 py-3 text-left hover:bg-accent/50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-muted-foreground">#{t.ticket_number}</span>
                      <span className="truncate font-medium">{t.title}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="secondary" className={statusColor[t.status]}>{statusLabel[t.status]}</Badge>
                      <Badge variant="secondary" className={priorityColor[t.priority]}>{t.priority}</Badge>
                      <span className="capitalize">{t.category}</span>
                      <span>· {t.source}</span>
                      {t.requester_email && <span>· {t.requester_email}</span>}
                      {t.due_date && <span>· due {new Date(t.due_date).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {new Date(t.created_at).toLocaleDateString()}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* New ticket dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>New ticket</DialogTitle></DialogHeader>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="md:col-span-2">
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={200} />
            </div>
            <div className="md:col-span-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={4000} rows={4} />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as TicketPriority })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PRIORITIES.map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Client</Label>
              <Select value={form.client_id || 'none'} onValueChange={(v) => setForm({ ...form, client_id: v === 'none' ? '' : v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— none —</SelectItem>
                  {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Assignee</Label>
              <Select value={form.assignee_id || 'none'} onValueChange={(v) => setForm({ ...form, assignee_id: v === 'none' ? '' : v })}>
                <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— unassigned —</SelectItem>
                  {profiles.map((p) => <SelectItem key={p.user_id} value={p.user_id}>{p.full_name || 'Unnamed'}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Requester name</Label>
              <Input value={form.requester_name} onChange={(e) => setForm({ ...form, requester_name: e.target.value })} maxLength={120} />
            </div>
            <div>
              <Label>Requester email</Label>
              <Input type="email" value={form.requester_email} onChange={(e) => setForm({ ...form, requester_email: e.target.value })} maxLength={200} />
            </div>
            <div>
              <Label>Due date</Label>
              <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
            </div>
            <div>
              <Label>Tags (comma separated)</Label>
              <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={submitForm}>Create</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => { if (!o) setSelected(null); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className="font-mono text-sm text-muted-foreground">#{selected.ticket_number}</span>
                  {selected.title}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-3">
                  <div>
                    <Label>Status</Label>
                    <Select value={selected.status} onValueChange={(v) => canEdit && updateField(selected.id, { status: v as TicketStatus })} disabled={!canEdit}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{statusLabel[s]}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Priority</Label>
                    <Select value={selected.priority} onValueChange={(v) => canEdit && updateField(selected.id, { priority: v as TicketPriority })} disabled={!canEdit}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{PRIORITIES.map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Assignee</Label>
                    <Select
                      value={selected.assignee_id || 'none'}
                      onValueChange={(v) => canEdit && updateField(selected.id, { assignee_id: v === 'none' ? null : v })}
                      disabled={!canEdit}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— unassigned —</SelectItem>
                        {profiles.map((p) => <SelectItem key={p.user_id} value={p.user_id}>{p.full_name || 'Unnamed'}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="rounded-md border bg-muted/30 p-3 text-sm">
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground md:grid-cols-4">
                    <div><span className="font-medium text-foreground">Source:</span> {selected.source}</div>
                    <div><span className="font-medium text-foreground">Category:</span> {selected.category}</div>
                    <div><span className="font-medium text-foreground">Created:</span> {new Date(selected.created_at).toLocaleString()}</div>
                    <div><span className="font-medium text-foreground">Due:</span> {selected.due_date ? new Date(selected.due_date).toLocaleDateString() : '—'}</div>
                    <div><span className="font-medium text-foreground">First response:</span> {selected.first_response_at ? new Date(selected.first_response_at).toLocaleString() : '—'}</div>
                    <div><span className="font-medium text-foreground">Resolved:</span> {selected.resolved_at ? new Date(selected.resolved_at).toLocaleString() : '—'}</div>
                    <div><span className="font-medium text-foreground">Requester:</span> {selected.requester_name || '—'}</div>
                    <div><span className="font-medium text-foreground">Email:</span> {selected.requester_email || '—'}</div>
                  </div>
                  {selected.description && (
                    <p className="mt-3 whitespace-pre-wrap text-foreground">{selected.description}</p>
                  )}
                  {selected.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {selected.tags.map((t) => <Badge key={t} variant="outline">{t}</Badge>)}
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold"><Paperclip className="h-4 w-4" /> Attachments</h4>
                  {attachments.length === 0 && <p className="text-xs text-muted-foreground">None yet.</p>}
                  <ul className="space-y-1">
                    {attachments.map((a) => (
                      <li key={a.id} className="flex items-center justify-between rounded border px-2 py-1 text-sm">
                        <button onClick={() => downloadAttachment(a)} className="truncate text-primary hover:underline">{a.file_name}</button>
                        <span className="text-xs text-muted-foreground">{a.size_bytes ? `${Math.round(a.size_bytes / 1024)} KB` : ''}</span>
                      </li>
                    ))}
                  </ul>
                  {canEdit && (
                    <div className="mt-2">
                      <Input type="file" multiple onChange={(e) => uploadFiles(e.target.files)} />
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold"><MessageSquare className="h-4 w-4" /> Comments</h4>
                  <div className="space-y-2">
                    {comments.length === 0 && <p className="text-xs text-muted-foreground">No comments yet.</p>}
                    {comments.map((c) => (
                      <div key={c.id} className="rounded border bg-card p-2 text-sm">
                        <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">{c.author_name}</span>
                          <span>{new Date(c.created_at).toLocaleString()}</span>
                        </div>
                        <p className="whitespace-pre-wrap">{c.body}</p>
                      </div>
                    ))}
                  </div>
                  {canEdit && (
                    <div className="mt-2 flex gap-2">
                      <Textarea value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Add a comment…" rows={2} maxLength={2000} />
                      <Button onClick={addComment} disabled={!newComment.trim()}>Post</Button>
                    </div>
                  )}
                </div>

                {canEdit && (
                  <div className="flex justify-end gap-2 border-t pt-3">
                    <Button variant="outline" onClick={() => toggleArchive(selected)}>
                      {selected.archived ? <><ArchiveRestore className="h-4 w-4" /> Restore</> : <><Archive className="h-4 w-4" /> Archive</>}
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
