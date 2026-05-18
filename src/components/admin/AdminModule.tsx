import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import type { AppRole, AppDepartment } from '@/hooks/useAuth';
import { Loader2, Plus, Copy, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

type Member = {
  user_id: string;
  full_name: string | null;
  role: AppRole;
  department: AppDepartment | null;
  is_active: boolean;
};

type AuditEntry = {
  id: string;
  actor_id: string | null;
  action: string;
  target_user_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
};

const ROLES: AppRole[] = ['admin', 'manager', 'staff'];
const DEPARTMENTS: AppDepartment[] = ['sales', 'marketing', 'customer_success', 'engineering', 'design', 'operations'];

export function AdminModule() {
  const [members, setMembers] = useState<Member[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<AppRole>('staff');
  const [newDept, setNewDept] = useState<AppDepartment | 'none'>('none');
  const [lastCreated, setLastCreated] = useState<{ email: string; password: string } | null>(null);
  const { toast } = useToast();

  const generatePassword = (len = 14) => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    const arr = new Uint32Array(len);
    crypto.getRandomValues(arr);
    return Array.from(arr, (n) => chars[n % chars.length]).join('');
  };

  const handleCreate = async () => {
    const email = newEmail.trim().toLowerCase();
    if (!email.endsWith('@tryclea.com')) {
      toast({ title: 'Invalid email', description: 'Only @tryclea.com emails are allowed.', variant: 'destructive' });
      return;
    }
    const password = newPassword.trim() || generatePassword(14);
    setCreating(true);
    const { data, error } = await supabase.functions.invoke('admin-create-user', {
      body: {
        users: [{
          email,
          password,
          full_name: newName.trim() || email.split('@')[0],
          role: newRole,
          department: newDept === 'none' ? null : newDept,
        }],
      },
    });
    setCreating(false);
    const result = (data as any)?.results?.[0];
    if (error || !result || result.status !== 'created') {
      toast({
        title: 'Create failed',
        description: error?.message || result?.error || 'Unknown error',
        variant: 'destructive',
      });
      return;
    }
    setLastCreated({ email: result.email, password: result.password });
    setNewEmail(''); setNewName(''); setNewPassword(''); setNewRole('staff'); setNewDept('none');
    load();
  };

  const copyCreds = () => {
    if (!lastCreated) return;
    navigator.clipboard.writeText(`${lastCreated.email} / ${lastCreated.password}`);
    toast({ title: 'Copied', description: 'Credentials copied to clipboard.' });
  };

  const load = async () => {
    setLoading(true);
    const [{ data: profiles }, { data: roles }, { data: auditData }] = await Promise.all([
      supabase.from('profiles').select('user_id, full_name'),
      supabase.from('user_roles').select('user_id, role, department, is_active'),
      supabase.from('audit_log').select('*').order('created_at', { ascending: false }).limit(100),
    ]);
    const roleMap = new Map((roles ?? []).map((r) => [r.user_id, r]));
    const merged: Member[] = (profiles ?? []).map((p) => {
      const r = roleMap.get(p.user_id);
      return {
        user_id: p.user_id,
        full_name: p.full_name,
        role: (r?.role as AppRole) ?? 'staff',
        department: (r?.department as AppDepartment) ?? null,
        is_active: r?.is_active ?? true,
      };
    });
    setMembers(merged);
    setAudit((auditData ?? []) as AuditEntry[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const update = async (
    userId: string,
    patch: Partial<Pick<Member, 'role' | 'department' | 'is_active'>>,
  ) => {
    setSavingId(userId);
    const current = members.find((m) => m.user_id === userId);
    if (!current) return;
    const next = { ...current, ...patch };
    setMembers((prev) => prev.map((m) => (m.user_id === userId ? next : m)));

    const { error } = await supabase
      .from('user_roles')
      .update({ role: next.role, department: next.department, is_active: next.is_active })
      .eq('user_id', userId);

    setSavingId(null);
    if (error) {
      toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
      load();
    } else {
      toast({ title: 'Updated', description: `${current.full_name ?? 'User'} updated.` });
      // refresh audit silently
      supabase
        .from('audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)
        .then(({ data }) => data && setAudit(data as AuditEntry[]));
    }
  };

  const filtered = members.filter((m) =>
    (m.full_name ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const memberName = (id: string | null) =>
    members.find((m) => m.user_id === id)?.full_name ?? id?.slice(0, 8) ?? '—';

  const formatAction = (a: AuditEntry) => {
    const d = a.details ?? {};
    switch (a.action) {
      case 'role_changed': return `Role: ${d.from} → ${d.to}`;
      case 'department_changed': return `Dept: ${d.from ?? 'none'} → ${d.to ?? 'none'}`;
      case 'user_activated': return 'Activated';
      case 'user_deactivated': return 'Deactivated';
      default: return a.action;
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Team Administration</h2>
        <p className="text-sm text-muted-foreground">Assign roles and departments, deactivate access, review changes.</p>
      </div>

      <Tabs defaultValue="members">
        <TabsList>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="audit">Audit log</TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="space-y-4">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Search by name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
            <Button onClick={() => { setLastCreated(null); setCreateOpen(true); }} className="ml-auto">
              <Plus className="h-4 w-4 mr-1" /> New user
            </Button>
          </div>

          <Card className="overflow-hidden">
            <div className="grid grid-cols-12 gap-3 border-b bg-muted/40 px-4 py-2 text-xs font-medium uppercase text-muted-foreground">
              <div className="col-span-4">Member</div>
              <div className="col-span-3">Role</div>
              <div className="col-span-3">Department</div>
              <div className="col-span-2 text-right">Active</div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center p-8 text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No team members found.</div>
            ) : (
              filtered.map((m) => (
                <div key={m.user_id} className={`grid grid-cols-12 items-center gap-3 border-b px-4 py-3 last:border-b-0 ${!m.is_active ? 'opacity-60' : ''}`}>
                  <div className="col-span-4">
                    <div className="font-medium flex items-center gap-2">
                      {m.full_name || 'Unnamed'}
                      {!m.is_active && <Badge variant="outline">Inactive</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{m.user_id}</div>
                  </div>
                  <div className="col-span-3">
                    <Select value={m.role} onValueChange={(v) => update(m.user_id, { role: v as AppRole })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ROLES.map((r) => (
                          <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-3">
                    <Select
                      value={m.department ?? 'none'}
                      onValueChange={(v) => update(m.user_id, { department: v === 'none' ? null : (v as AppDepartment) })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— None —</SelectItem>
                        {DEPARTMENTS.map((d) => (
                          <SelectItem key={d} value={d} className="capitalize">{d.replace('_', ' ')}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2 flex items-center justify-end gap-2">
                    {savingId === m.user_id && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                    <Switch
                      checked={m.is_active}
                      onCheckedChange={(v) => update(m.user_id, { is_active: v })}
                    />
                  </div>
                </div>
              ))
            )}
          </Card>

          <Button variant="outline" size="sm" onClick={load} disabled={loading}>Refresh</Button>
        </TabsContent>

        <TabsContent value="audit">
          <Card className="overflow-hidden">
            <div className="grid grid-cols-12 gap-3 border-b bg-muted/40 px-4 py-2 text-xs font-medium uppercase text-muted-foreground">
              <div className="col-span-3">When</div>
              <div className="col-span-3">Actor</div>
              <div className="col-span-3">Target</div>
              <div className="col-span-3">Change</div>
            </div>
            {audit.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No activity yet.</div>
            ) : (
              audit.map((a) => (
                <div key={a.id} className="grid grid-cols-12 gap-3 border-b px-4 py-2 text-sm last:border-b-0">
                  <div className="col-span-3 text-muted-foreground">{new Date(a.created_at).toLocaleString()}</div>
                  <div className="col-span-3">{memberName(a.actor_id)}</div>
                  <div className="col-span-3">{memberName(a.target_user_id)}</div>
                  <div className="col-span-3">{formatAction(a)}</div>
                </div>
              ))
            )}
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create new user</DialogTitle>
          </DialogHeader>
          {lastCreated ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">User created. Share these credentials securely — the password will not be shown again.</p>
              <div className="rounded-md border p-3 space-y-1 font-mono text-sm">
                <div><span className="text-muted-foreground">Email:</span> {lastCreated.email}</div>
                <div><span className="text-muted-foreground">Password:</span> {lastCreated.password}</div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={copyCreds}><Copy className="h-4 w-4 mr-1" />Copy</Button>
                <Button size="sm" onClick={() => setLastCreated(null)}>Create another</Button>
                <Button size="sm" variant="ghost" onClick={() => setCreateOpen(false)}>Done</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <Label>Email (@tryclea.com)</Label>
                <Input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="name@tryclea.com" />
              </div>
              <div>
                <Label>Full name</Label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Optional" />
              </div>
              <div>
                <Label>Password</Label>
                <div className="flex gap-2">
                  <Input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Leave blank to auto-generate" />
                  <Button type="button" variant="outline" size="icon" onClick={() => setNewPassword(generatePassword(14))} title="Generate">
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Role</Label>
                  <Select value={newRole} onValueChange={(v) => setNewRole(v as AppRole)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Department</Label>
                  <Select value={newDept} onValueChange={(v) => setNewDept(v as AppDepartment | 'none')}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— None —</SelectItem>
                      {DEPARTMENTS.map((d) => <SelectItem key={d} value={d} className="capitalize">{d.replace('_', ' ')}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={creating || !newEmail}>
                  {creating && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                  Create user
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
