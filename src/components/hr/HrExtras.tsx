import { useEffect, useState } from 'react';
import { Plus, Check, X, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

type LeaveRow = {
  id: string;
  user_id: string;
  requester_name: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  approver_name: string;
  decided_at: string | null;
  decision_note: string;
};

const statusStyles: Record<string, string> = {
  pending: 'bg-warning/10 text-warning',
  approved: 'bg-success/10 text-success',
  rejected: 'bg-destructive/10 text-destructive',
};

export function LeaveRequests() {
  const { user, role, department } = useAuth();
  const canManage = role === 'admin' || department === 'hr' || department === 'operations';
  const [rows, setRows] = useState<LeaveRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('leave_requests').select('*').order('created_at', { ascending: false });
    setRows((data ?? []) as LeaveRow[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const decide = async (id: string, status: 'approved' | 'rejected') => {
    const profile = await supabase.from('profiles').select('full_name').eq('user_id', user!.id).single();
    const { error } = await supabase.from('leave_requests').update({
      status,
      approver_id: user!.id,
      approver_name: profile.data?.full_name || user!.email,
      decided_at: new Date().toISOString(),
    }).eq('id', id);
    if (error) return toast.error(error.message);
    toast.success(`Request ${status}`);
    load();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Leave Requests</h3>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus className="mr-1 h-4 w-4" /> New request
        </Button>
      </div>
      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
        <div className="space-y-2">
          {rows.length === 0 && <p className="text-sm text-muted-foreground">No leave requests yet.</p>}
          {rows.map((r) => (
            <div key={r.id} className="stat-card space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">{r.requester_name || 'Employee'} · {r.leave_type}</p>
                  <p className="text-xs text-muted-foreground">{r.start_date} → {r.end_date}</p>
                </div>
                <span className={`dept-badge ${statusStyles[r.status]}`}>{r.status}</span>
              </div>
              {r.reason && <p className="text-sm text-muted-foreground italic">"{r.reason}"</p>}
              {r.approver_name && r.decided_at && (
                <p className="text-xs text-muted-foreground">Decided by {r.approver_name} · {new Date(r.decided_at).toLocaleString()}</p>
              )}
              {canManage && r.status === 'pending' && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => decide(r.id, 'approved')}>
                    <Check className="h-3 w-3 mr-1" /> Approve
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => decide(r.id, 'rejected')}>
                    <X className="h-3 w-3 mr-1" /> Reject
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Request leave</DialogTitle></DialogHeader>
          <LeaveForm onDone={() => { setShowForm(false); load(); }} onCancel={() => setShowForm(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LeaveForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const { user } = useAuth();
  const [form, setForm] = useState({ leave_type: 'Annual', start_date: '', end_date: '', reason: '' });
  const submit = async () => {
    if (!user || !form.start_date || !form.end_date) return;
    const profile = await supabase.from('profiles').select('full_name').eq('user_id', user.id).single();
    const { error } = await supabase.from('leave_requests').insert({
      user_id: user.id,
      requester_name: profile.data?.full_name || user.email || 'Employee',
      ...form,
    });
    if (error) return toast.error(error.message);
    toast.success('Leave requested');
    onDone();
  };
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-sm">Type</Label>
        <Select value={form.leave_type} onValueChange={(v) => setForm({ ...form, leave_type: v })}>
          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
          <SelectContent>{['Annual','Sick','Unpaid','Other'].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div><Label className="text-sm">Start</Label><Input type="date" value={form.start_date} onChange={(e)=>setForm({...form,start_date:e.target.value})} className="mt-1" /></div>
        <div><Label className="text-sm">End</Label><Input type="date" value={form.end_date} onChange={(e)=>setForm({...form,end_date:e.target.value})} className="mt-1" /></div>
      </div>
      <div><Label className="text-sm">Reason</Label><Textarea value={form.reason} onChange={(e)=>setForm({...form,reason:e.target.value})} className="mt-1" rows={3} /></div>
      <div className="flex gap-2 pt-2">
        <Button variant="outline" className="flex-1" onClick={onCancel}>Cancel</Button>
        <Button className="flex-1" onClick={submit} disabled={!form.start_date || !form.end_date}>Submit</Button>
      </div>
    </div>
  );
}

// ---- Onboarding Checklist ----
type OnbRow = { id: string; user_id: string; employee_name: string; title: string; status: 'pending' | 'done'; completed_at: string | null };

const DEFAULT_ONBOARDING_TASKS = [
  'Sign offer letter',
  'Submit ID + tax docs',
  'Set up email & Slack',
  'Complete compliance training',
  'Meet team lead',
  'Review handbook',
];

export function OnboardingChecklists() {
  const { user, role, department } = useAuth();
  const canManage = role === 'admin' || department === 'hr' || department === 'operations';
  const [rows, setRows] = useState<OnbRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<{ user_id: string; full_name: string }[]>([]);
  const [target, setTarget] = useState<string>('');

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('hr_onboarding_tasks').select('*').order('created_at', { ascending: true });
    setRows((data ?? []) as OnbRow[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    if (canManage) {
      supabase.from('profiles').select('user_id, full_name').then(({ data }) => {
        setEmployees(((data ?? []) as any[]).filter((p) => p.full_name));
      });
    }
  }, []);

  const seedFor = async (uid: string) => {
    const emp = employees.find((e) => e.user_id === uid);
    if (!emp) return;
    const rows = DEFAULT_ONBOARDING_TASKS.map((title) => ({
      user_id: uid, employee_name: emp.full_name, title, status: 'pending' as const,
    }));
    const { error } = await supabase.from('hr_onboarding_tasks').insert(rows);
    if (error) return toast.error(error.message);
    toast.success(`Seeded onboarding for ${emp.full_name}`);
    setTarget('');
    load();
  };

  const toggle = async (item: OnbRow) => {
    const status = item.status === 'done' ? 'pending' : 'done';
    const { error } = await supabase.from('hr_onboarding_tasks').update({
      status, completed_at: status === 'done' ? new Date().toISOString() : null,
    }).eq('id', item.id);
    if (error) return toast.error(error.message);
    load();
  };

  // Group by employee
  const grouped = rows.reduce<Record<string, OnbRow[]>>((acc, r) => {
    const k = `${r.user_id}::${r.employee_name}`;
    (acc[k] ||= []).push(r);
    return acc;
  }, {});

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Onboarding Checklists</h3>
        {canManage && (
          <div className="flex gap-2">
            <Select value={target} onValueChange={setTarget}>
              <SelectTrigger className="h-8 w-56 text-sm"><SelectValue placeholder="Pick employee to seed…" /></SelectTrigger>
              <SelectContent>
                {employees.map((e) => <SelectItem key={e.user_id} value={e.user_id}>{e.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" disabled={!target} onClick={() => seedFor(target)}>Seed defaults</Button>
          </div>
        )}
      </div>
      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
        Object.keys(grouped).length === 0 ? (
          <p className="text-sm text-muted-foreground">No onboarding checklists yet.</p>
        ) : (
          <div className="space-y-3">
            {Object.entries(grouped).map(([key, items]) => {
              const [uid, name] = key.split('::');
              const done = items.filter((i) => i.status === 'done').length;
              return (
                <div key={key} className="stat-card space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-sm">{name}</h4>
                    <span className="text-xs text-muted-foreground">{done}/{items.length} complete</span>
                  </div>
                  <div className="space-y-1">
                    {items.map((i) => {
                      const editable = canManage || i.user_id === user?.id;
                      return (
                        <button
                          key={i.id}
                          disabled={!editable}
                          onClick={() => toggle(i)}
                          className="flex w-full items-center gap-2 rounded-md border p-2 text-sm text-left transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          <div className={`flex h-4 w-4 items-center justify-center rounded border ${i.status === 'done' ? 'bg-success border-success text-success-foreground' : 'border-border'}`}>
                            {i.status === 'done' && <Check className="h-3 w-3" />}
                          </div>
                          <span className={i.status === 'done' ? 'line-through text-muted-foreground' : ''}>{i.title}</span>
                          {i.completed_at && <span className="ml-auto text-xs text-muted-foreground"><Clock className="h-3 w-3 inline mr-1" />{new Date(i.completed_at).toLocaleDateString()}</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
