import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth, type AppDepartment } from '@/hooks/useAuth';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Inbox, Users as UsersIcon, Ticket as TicketIcon, Wallet, LayoutDashboard } from 'lucide-react';

type Item = {
  id: string;
  title: string;
  type: 'ticket' | 'client' | 'project_task' | 'payment_exception';
  status: string;
  priority?: string | null;
  assignee_id: string | null;
  assigned_team: AppDepartment | null;
  updated_at: string;
};

const ICONS = {
  ticket: TicketIcon,
  client: UsersIcon,
  project_task: LayoutDashboard,
  payment_exception: Wallet,
};

const TYPE_LABEL: Record<Item['type'], string> = {
  ticket: 'Ticket',
  client: 'Customer',
  project_task: 'Task',
  payment_exception: 'Payment',
};

export function MyWorkModule({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const { user, department, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [mine, setMine] = useState<Item[]>([]);
  const [team, setTeam] = useState<Item[]>([]);

  useEffect(() => {
    if (!user) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, department]);

  async function load() {
    setLoading(true);
    const dept = department;

    const [ticketsMine, ticketsTeam, clientsMine, clientsTeam, tasksMine, tasksTeam, peMine, peTeam] = await Promise.all([
      supabase.from('tickets').select('id,title,status,priority,assignee_id,category,updated_at').eq('assignee_id', user!.id).eq('archived', false).limit(50),
      dept ? supabase.from('tickets').select('id,title,status,priority,assignee_id,category,updated_at').is('assignee_id', null).eq('archived', false).limit(50) : Promise.resolve({ data: [] as any[] }),
      supabase.from('clients').select('id,company_name,stage,assignee_id,assigned_team,updated_at').eq('assignee_id', user!.id).eq('archived', false).limit(50),
      dept ? supabase.from('clients').select('id,company_name,stage,assignee_id,assigned_team,updated_at').eq('assigned_team', dept).is('assignee_id', null).eq('archived', false).limit(50) : Promise.resolve({ data: [] as any[] }),
      supabase.from('project_tasks').select('id,title,column_name,priority,assignee_id,assigned_team,updated_at').eq('assignee_id', user!.id).eq('archived', false).limit(50),
      dept ? supabase.from('project_tasks').select('id,title,column_name,priority,assignee_id,assigned_team,updated_at').eq('assigned_team', dept).is('assignee_id', null).eq('archived', false).limit(50) : Promise.resolve({ data: [] as any[] }),
      supabase.from('payment_exceptions').select('id,reference,description,status,priority,assignee_id,assigned_team,updated_at').eq('assignee_id', user!.id).eq('archived', false).limit(50),
      dept ? supabase.from('payment_exceptions').select('id,reference,description,status,priority,assignee_id,assigned_team,updated_at').eq('assigned_team', dept).is('assignee_id', null).eq('archived', false).limit(50) : Promise.resolve({ data: [] as any[] }),
    ]);

    const mineList: Item[] = [
      ...((ticketsMine.data ?? []) as any[]).map((t) => ({ id: t.id, title: t.title, type: 'ticket' as const, status: t.status, priority: t.priority, assignee_id: t.assignee_id, assigned_team: null, updated_at: t.updated_at })),
      ...((clientsMine.data ?? []) as any[]).map((c) => ({ id: c.id, title: c.company_name, type: 'client' as const, status: c.stage, priority: null, assignee_id: c.assignee_id, assigned_team: c.assigned_team, updated_at: c.updated_at })),
      ...((tasksMine.data ?? []) as any[]).map((t) => ({ id: t.id, title: t.title, type: 'project_task' as const, status: t.column_name, priority: t.priority, assignee_id: t.assignee_id, assigned_team: t.assigned_team, updated_at: t.updated_at })),
      ...((peMine.data ?? []) as any[]).map((p) => ({ id: p.id, title: p.reference || p.description?.slice(0, 60) || 'Payment exception', type: 'payment_exception' as const, status: p.status, priority: p.priority, assignee_id: p.assignee_id, assigned_team: p.assigned_team, updated_at: p.updated_at })),
    ].sort((a, b) => (b.updated_at ?? '').localeCompare(a.updated_at ?? ''));

    const teamList: Item[] = [
      ...((ticketsTeam.data ?? []) as any[]).map((t) => ({ id: t.id, title: t.title, type: 'ticket' as const, status: t.status, priority: t.priority, assignee_id: t.assignee_id, assigned_team: null, updated_at: t.updated_at })),
      ...((clientsTeam.data ?? []) as any[]).map((c) => ({ id: c.id, title: c.company_name, type: 'client' as const, status: c.stage, priority: null, assignee_id: c.assignee_id, assigned_team: c.assigned_team, updated_at: c.updated_at })),
      ...((tasksTeam.data ?? []) as any[]).map((t) => ({ id: t.id, title: t.title, type: 'project_task' as const, status: t.column_name, priority: t.priority, assignee_id: t.assignee_id, assigned_team: t.assigned_team, updated_at: t.updated_at })),
      ...((peTeam.data ?? []) as any[]).map((p) => ({ id: p.id, title: p.reference || p.description?.slice(0, 60) || 'Payment exception', type: 'payment_exception' as const, status: p.status, priority: p.priority, assignee_id: p.assignee_id, assigned_team: p.assigned_team, updated_at: p.updated_at })),
    ].sort((a, b) => (b.updated_at ?? '').localeCompare(a.updated_at ?? ''));

    setMine(mineList);
    setTeam(teamList);
    setLoading(false);
  }

  const goToTab = (t: Item['type']) => {
    if (!onNavigate) return;
    if (t === 'ticket') onNavigate('tickets');
    else if (t === 'client') onNavigate('clients');
    else if (t === 'project_task') onNavigate('projects');
    else if (t === 'payment_exception') onNavigate('payments');
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2"><Inbox className="h-6 w-6 text-primary" /> My Work</h2>
        <p className="text-sm text-muted-foreground">
          {department ? <>Items assigned to you, and unassigned items in <span className="font-medium capitalize">{department.replace('_', ' ')}</span>.</> : 'Items assigned to you.'}
          {isAdmin && <span className="ml-2 text-xs">(Admin view — also see Team Queues in each module.)</span>}
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Section title="Assigned to me" items={mine} onOpen={goToTab} emptyMsg="Nothing assigned to you right now." />
          <Section title={department ? `${department.replace('_', ' ')} queue (unassigned)` : 'Team queue'} items={team} onOpen={goToTab} emptyMsg="No unassigned items in your team's queue." />
        </div>
      )}
    </div>
  );
}

function Section({ title, items, onOpen, emptyMsg }: { title: string; items: Item[]; onOpen: (t: Item['type']) => void; emptyMsg: string }) {
  return (
    <Card className="p-4">
      <h3 className="font-semibold capitalize mb-3">{title} <Badge variant="secondary" className="ml-2">{items.length}</Badge></h3>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyMsg}</p>
      ) : (
        <ul className="space-y-1.5 max-h-[60vh] overflow-auto">
          {items.map((i) => {
            const Icon = ICONS[i.type];
            return (
              <li key={`${i.type}-${i.id}`}>
                <button
                  onClick={() => onOpen(i.type)}
                  className="w-full text-left flex items-center gap-3 rounded-md p-2 hover:bg-muted transition-colors"
                >
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{i.title}</div>
                    <div className="text-xs text-muted-foreground">{TYPE_LABEL[i.type]} · {i.status}{i.priority ? ` · ${i.priority}` : ''}</div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
