import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ScrollText, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Entry = {
  id: string;
  item_type: string;
  item_id: string;
  actor_id: string | null;
  action: string;
  from_value: string | null;
  to_value: string | null;
  created_at: string;
};

type Profile = { user_id: string; full_name: string | null };

const ACTION_COLOR: Record<string, string> = {
  created: 'bg-blue-500/15 text-blue-700',
  status_changed: 'bg-amber-500/15 text-amber-700',
  assigned: 'bg-purple-500/15 text-purple-700',
  resolved: 'bg-green-500/15 text-green-700',
};

export function AuditLogModule() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [profiles, setProfiles] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  async function load() {
    setLoading(true);
    const [{ data: ents }, { data: profs }] = await Promise.all([
      supabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(500),
      supabase.from('profiles').select('user_id, full_name'),
    ]);
    setEntries((ents ?? []) as Entry[]);
    const map = new Map<string, string>();
    ((profs ?? []) as Profile[]).forEach((p) => map.set(p.user_id, p.full_name ?? p.user_id.slice(0, 8)));
    setProfiles(map);
    setLoading(false);
  }
  useEffect(() => { void load(); }, []);

  const filtered = entries.filter((e) => {
    if (typeFilter !== 'all' && e.item_type !== typeFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      const actor = profiles.get(e.actor_id ?? '') ?? '';
      return (
        e.action.toLowerCase().includes(s) ||
        e.item_type.toLowerCase().includes(s) ||
        actor.toLowerCase().includes(s) ||
        (e.from_value ?? '').toLowerCase().includes(s) ||
        (e.to_value ?? '').toLowerCase().includes(s)
      );
    }
    return true;
  });

  function exportCsv() {
    const rows = [
      ['When', 'Actor', 'Item type', 'Item id', 'Action', 'From', 'To'],
      ...filtered.map((e) => [
        new Date(e.created_at).toISOString(),
        profiles.get(e.actor_id ?? '') ?? '',
        e.item_type,
        e.item_id,
        e.action,
        e.from_value ?? '',
        e.to_value ?? '',
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="container mx-auto p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><ScrollText className="h-6 w-6 text-primary" /> Audit Log</h2>
          <p className="text-sm text-muted-foreground">Every assignment, status change and item creation across the platform.</p>
        </div>
        <Button variant="outline" onClick={exportCsv}><Download className="h-4 w-4 mr-1" /> Export CSV</Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Input className="max-w-xs" placeholder="Search action, value, actor…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All item types</SelectItem>
            <SelectItem value="ticket">Tickets</SelectItem>
            <SelectItem value="client">Customers</SelectItem>
            <SelectItem value="project_task">Project tasks</SelectItem>
            <SelectItem value="payment_exception">Payment exceptions</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="ml-auto">Refresh</Button>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[900px]">
            <div className="grid grid-cols-12 gap-3 border-b bg-muted/40 px-4 py-2 text-xs font-medium uppercase text-muted-foreground">
              <div className="col-span-2">When</div>
              <div className="col-span-2">Actor</div>
              <div className="col-span-2">Item</div>
              <div className="col-span-2">Action</div>
              <div className="col-span-4">Change</div>
            </div>
            {loading ? (
              <div className="flex items-center justify-center p-8 text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…</div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No activity matches.</div>
            ) : (
              filtered.map((e) => (
                <div key={e.id} className="grid grid-cols-12 gap-3 border-b px-4 py-2 text-sm last:border-b-0">
                  <div className="col-span-2 text-muted-foreground">{new Date(e.created_at).toLocaleString()}</div>
                  <div className="col-span-2 truncate">{profiles.get(e.actor_id ?? '') ?? '—'}</div>
                  <div className="col-span-2 capitalize">{e.item_type.replace('_', ' ')}</div>
                  <div className="col-span-2"><Badge className={ACTION_COLOR[e.action] ?? ''}>{e.action.replace('_', ' ')}</Badge></div>
                  <div className="col-span-4 text-xs text-muted-foreground">
                    {e.from_value || e.to_value ? (
                      <><span className="font-mono">{e.from_value ?? '∅'}</span> → <span className="font-mono">{e.to_value ?? '∅'}</span></>
                    ) : '—'}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
