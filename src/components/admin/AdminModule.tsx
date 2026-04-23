import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import type { AppRole, AppDepartment } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

type Member = {
  user_id: string;
  full_name: string | null;
  role: AppRole;
  department: AppDepartment | null;
};

const ROLES: AppRole[] = ['admin', 'manager', 'staff'];
const DEPARTMENTS: AppDepartment[] = ['sales', 'marketing', 'customer_success', 'engineering', 'design', 'operations'];

export function AdminModule() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabase.from('profiles').select('user_id, full_name'),
      supabase.from('user_roles').select('user_id, role, department'),
    ]);
    const roleMap = new Map((roles ?? []).map((r) => [r.user_id, r]));
    const merged: Member[] = (profiles ?? []).map((p) => {
      const r = roleMap.get(p.user_id);
      return {
        user_id: p.user_id,
        full_name: p.full_name,
        role: (r?.role as AppRole) ?? 'staff',
        department: (r?.department as AppDepartment) ?? null,
      };
    });
    setMembers(merged);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const update = async (userId: string, patch: Partial<Pick<Member, 'role' | 'department'>>) => {
    setSavingId(userId);
    const current = members.find((m) => m.user_id === userId);
    if (!current) return;
    const next = { ...current, ...patch };
    setMembers((prev) => prev.map((m) => (m.user_id === userId ? next : m)));

    const { error } = await supabase
      .from('user_roles')
      .update({ role: next.role, department: next.department })
      .eq('user_id', userId);

    setSavingId(null);
    if (error) {
      toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
      load();
    } else {
      toast({ title: 'Updated', description: `${current.full_name ?? 'User'} updated.` });
    }
  };

  const filtered = members.filter((m) =>
    (m.full_name ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="container mx-auto p-4 space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Team Administration</h2>
        <p className="text-sm text-muted-foreground">Assign roles and departments to team members.</p>
      </div>

      <Input
        placeholder="Search by name…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      <Card className="overflow-hidden">
        <div className="grid grid-cols-12 gap-3 border-b bg-muted/40 px-4 py-2 text-xs font-medium uppercase text-muted-foreground">
          <div className="col-span-5">Member</div>
          <div className="col-span-3">Role</div>
          <div className="col-span-3">Department</div>
          <div className="col-span-1 text-right">Status</div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-8 text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No team members found.</div>
        ) : (
          filtered.map((m) => (
            <div key={m.user_id} className="grid grid-cols-12 items-center gap-3 border-b px-4 py-3 last:border-b-0">
              <div className="col-span-5">
                <div className="font-medium">{m.full_name || 'Unnamed'}</div>
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
              <div className="col-span-1 flex justify-end">
                {savingId === m.user_id ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : (
                  <span className="text-xs text-muted-foreground">Saved</span>
                )}
              </div>
            </div>
          ))
        )}
      </Card>

      <Button variant="outline" size="sm" onClick={load} disabled={loading}>Refresh</Button>
    </div>
  );
}
