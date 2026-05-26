import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Wallet } from 'lucide-react';

type Row = {
  id: string;
  client_id: string | null;
  exception_type: string;
  amount: number;
  currency: string;
  reference: string;
  description: string;
  status: string;
  priority: string;
  assigned_team: string | null;
  assignee_id: string | null;
  resolution_note: string;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
};

const STATUSES = ['open', 'in_progress', 'waiting', 'resolved', 'closed'];
const TYPES = ['failed_payout', 'stuck_transfer', 'fx_mismatch', 'refund', 'compliance_hold', 'other'];
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

const STATUS_COLOR: Record<string, string> = {
  open: 'bg-blue-500/15 text-blue-700',
  in_progress: 'bg-amber-500/15 text-amber-700',
  waiting: 'bg-purple-500/15 text-purple-700',
  resolved: 'bg-green-500/15 text-green-700',
  closed: 'bg-muted text-muted-foreground',
};

const PRIORITY_COLOR: Record<string, string> = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-blue-500/15 text-blue-700',
  high: 'bg-orange-500/15 text-orange-700',
  urgent: 'bg-red-500/15 text-red-700',
};

export function PaymentsModule({ canEdit }: { canEdit: boolean }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | string>('open');
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Partial<Row> | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('payment_exceptions')
      .select('*')
      .eq('archived', false)
      .order('created_at', { ascending: false });
    setRows((data ?? []) as Row[]);
    setLoading(false);
  }
  useEffect(() => { void load(); }, []);

  const filtered = rows.filter((r) => filter === 'all' || r.status === filter);

  function openNew() {
    setEditing({ exception_type: 'failed_payout', amount: 0, currency: 'USD', priority: 'medium', status: 'open', assigned_team: 'payments_ops', description: '', reference: '' });
    setOpen(true);
  }
  function openEdit(r: Row) {
    setEditing({ ...r });
    setOpen(true);
  }

  async function save() {
    if (!editing) return;
    setSaving(true);
    if (editing.id) {
      const { id, created_at, updated_at, ...patch } = editing as any;
      const { error } = await supabase.from('payment_exceptions').update(patch).eq('id', id);
      if (error) { toast({ title: 'Save failed', description: error.message, variant: 'destructive' }); setSaving(false); return; }
    } else {
      const { error } = await supabase.from('payment_exceptions').insert({ ...(editing as any), created_by: user!.id });
      if (error) { toast({ title: 'Create failed', description: error.message, variant: 'destructive' }); setSaving(false); return; }
    }
    setSaving(false);
    setOpen(false);
    setEditing(null);
    await load();
  }

  async function quickStatus(r: Row, status: string) {
    const patch: any = { status };
    if (status === 'resolved' || status === 'closed') {
      patch.resolved_at = new Date().toISOString();
      patch.resolved_by = user!.id;
    }
    const { error } = await supabase.from('payment_exceptions').update(patch).eq('id', r.id);
    if (error) toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
    else load();
  }

  const counts = STATUSES.reduce<Record<string, number>>((acc, s) => {
    acc[s] = rows.filter((r) => r.status === s).length;
    return acc;
  }, {});

  return (
    <div className="container mx-auto p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><Wallet className="h-6 w-6 text-primary" /> Payments Operations</h2>
          <p className="text-sm text-muted-foreground">Failed payouts, stuck transfers, FX mismatches and refunds.</p>
        </div>
        {canEdit && <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> New exception</Button>}
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterChip label={`All (${rows.length})`} active={filter === 'all'} onClick={() => setFilter('all')} />
        {STATUSES.map((s) => (
          <FilterChip key={s} label={`${s.replace('_', ' ')} (${counts[s] ?? 0})`} active={filter === s} onClick={() => setFilter(s)} />
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[900px]">
            <div className="grid grid-cols-12 gap-3 border-b bg-muted/40 px-4 py-2 text-xs font-medium uppercase text-muted-foreground">
              <div className="col-span-3">Reference / Description</div>
              <div className="col-span-2">Type</div>
              <div className="col-span-2">Amount</div>
              <div className="col-span-2">Priority</div>
              <div className="col-span-3">Status</div>
            </div>
            {loading ? (
              <div className="flex items-center justify-center p-8 text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…</div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No payment exceptions.</div>
            ) : (
              filtered.map((r) => (
                <button key={r.id} onClick={() => canEdit && openEdit(r)} className="w-full text-left grid grid-cols-12 items-center gap-3 border-b px-4 py-3 hover:bg-muted/40 transition-colors">
                  <div className="col-span-3">
                    <div className="font-medium text-sm truncate">{r.reference || '—'}</div>
                    <div className="text-xs text-muted-foreground truncate">{r.description}</div>
                  </div>
                  <div className="col-span-2 text-sm capitalize">{r.exception_type.replace('_', ' ')}</div>
                  <div className="col-span-2 text-sm font-mono">{r.currency} {Number(r.amount).toLocaleString()}</div>
                  <div className="col-span-2"><Badge className={PRIORITY_COLOR[r.priority] ?? ''}>{r.priority}</Badge></div>
                  <div className="col-span-3 flex items-center gap-2">
                    <Badge className={STATUS_COLOR[r.status] ?? ''}>{r.status.replace('_', ' ')}</Badge>
                    {canEdit && r.status !== 'resolved' && r.status !== 'closed' && (
                      <Button size="sm" variant="outline" className="h-7 text-xs ml-auto" onClick={(e) => { e.stopPropagation(); quickStatus(r, 'resolved'); }}>
                        Resolve
                      </Button>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing?.id ? 'Edit exception' : 'New payment exception'}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Reference</Label><Input value={editing.reference ?? ''} onChange={(e) => setEditing({ ...editing, reference: e.target.value })} placeholder="PAY-..." /></div>
                <div>
                  <Label>Type</Label>
                  <Select value={editing.exception_type ?? 'other'} onValueChange={(v) => setEditing({ ...editing, exception_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t.replace('_', ' ')}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div><Label>Currency</Label><Input value={editing.currency ?? 'USD'} onChange={(e) => setEditing({ ...editing, currency: e.target.value.toUpperCase() })} /></div>
                <div className="col-span-2"><Label>Amount</Label><Input type="number" value={editing.amount ?? 0} onChange={(e) => setEditing({ ...editing, amount: Number(e.target.value) })} /></div>
              </div>
              <div><Label>Description</Label><Textarea value={editing.description ?? ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} rows={3} /></div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label>Priority</Label>
                  <Select value={editing.priority ?? 'medium'} onValueChange={(v) => setEditing({ ...editing, priority: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PRIORITIES.map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={editing.status ?? 'open'} onValueChange={(v) => setEditing({ ...editing, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace('_', ' ')}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Team</Label>
                  <Select value={editing.assigned_team ?? 'payments_ops'} onValueChange={(v) => setEditing({ ...editing, assigned_team: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="payments_ops">Payments Ops</SelectItem>
                      <SelectItem value="compliance">Compliance</SelectItem>
                      <SelectItem value="support">Support</SelectItem>
                      <SelectItem value="operations">Operations</SelectItem>
                      <SelectItem value="finance">Finance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {(editing.status === 'resolved' || editing.status === 'closed') && (
                <div><Label>Resolution note</Label><Textarea value={editing.resolution_note ?? ''} onChange={(e) => setEditing({ ...editing, resolution_note: e.target.value })} rows={2} /></div>
              )}
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Save</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
    >
      {label}
    </button>
  );
}
