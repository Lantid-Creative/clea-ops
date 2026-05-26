import { useEffect, useState } from 'react';
import { AlertCircle, ArrowRight, Check, Phone, FileCheck, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth, AppDepartment } from '@/hooks/useAuth';
import { toast } from 'sonner';

type QueueItem = { id: string; title: string; subtitle?: string; action?: { label: string; icon: any; run: () => Promise<unknown> } };
export type NavFilter = { stage?: string; status?: string };
type QueueConfig = {
  label: string;
  description: string;
  targetTab: string;
  filter?: NavFilter;
  fetch: () => Promise<QueueItem[]>;
};

const queueFor = (dept: AppDepartment | null, _role: string | null, refresh: () => void): QueueConfig | null => {
  if (!dept) return null;

  const markContacted = async (id: string) => {
    const { error } = await supabase
      .from('clients')
      .update({ last_contact_date: new Date().toISOString(), follow_up_required: false })
      .eq('id', id);
    if (error) return toast.error(error.message);
    toast.success('Marked as contacted');
    refresh();
  };

  const advanceStage = async (id: string, stage: string, successMsg: string) => {
    const patch: any = { stage };
    if (stage === 'Onboarded') patch.onboard_date = new Date().toISOString().slice(0, 10);
    const { error } = await supabase.from('clients').update(patch).eq('id', id);
    if (error) return toast.error(error.message);
    toast.success(successMsg);
    refresh();
  };

  switch (dept) {
    case 'compliance':
      return {
        label: 'Pending KYC reviews',
        description: 'Customers waiting for compliance to review their documents.',
        targetTab: 'clients',
        filter: { stage: 'KYC Submitted' },
        fetch: async () => {
          const { data } = await supabase
            .from('clients')
            .select('id, company_name, stage, created_at')
            .in('stage', ['KYC Submitted', 'KYC Review'])
            .eq('archived', false)
            .order('created_at', { ascending: true })
            .limit(5);
          return (data ?? []).map((c) => ({
            id: c.id,
            title: c.company_name,
            subtitle: c.stage,
            action: c.stage === 'KYC Submitted'
              ? { label: 'Start review', icon: FileCheck, run: () => advanceStage(c.id, 'KYC Review', 'Moved to KYC Review') }
              : { label: 'Approve KYC', icon: Check, run: () => advanceStage(c.id, 'Verified', 'KYC verified') },
          }));
        },
      };
    case 'onboarding':
      return {
        label: 'Verified — ready to onboard',
        description: 'Customers passed compliance and are waiting for onboarding.',
        targetTab: 'clients',
        filter: { stage: 'Verified' },
        fetch: async () => {
          const { data } = await supabase
            .from('clients')
            .select('id, company_name, country')
            .eq('stage', 'Verified')
            .eq('archived', false)
            .order('created_at', { ascending: true })
            .limit(5);
          return (data ?? []).map((c) => ({
            id: c.id,
            title: c.company_name,
            subtitle: c.country,
            action: { label: 'Mark onboarded', icon: UserPlus, run: () => advanceStage(c.id, 'Onboarded', 'Customer onboarded') },
          }));
        },
      };
    case 'sales':
      return {
        label: 'Leads needing contact',
        description: 'New leads that have not been moved forward yet.',
        targetTab: 'clients',
        filter: { stage: 'Lead' },
        fetch: async () => {
          const { data } = await supabase
            .from('clients')
            .select('id, company_name, created_at')
            .eq('stage', 'Lead')
            .eq('archived', false)
            .order('created_at', { ascending: true })
            .limit(5);
          return (data ?? []).map((c) => ({
            id: c.id,
            title: c.company_name,
            subtitle: new Date(c.created_at).toLocaleDateString(),
            action: { label: 'Mark contacted', icon: Phone, run: () => markContacted(c.id) },
          }));
        },
      };
    case 'customer_success':
      return {
        label: 'Churn risk — no contact 30d+',
        description: 'Active customers with no recent engagement.',
        targetTab: 'clients',
        fetch: async () => {
          const cutoff = new Date(Date.now() - 30 * 86400_000).toISOString();
          const { data } = await supabase
            .from('clients')
            .select('id, company_name, last_contact_date')
            .eq('stage', 'Active')
            .eq('archived', false)
            .or(`last_contact_date.is.null,last_contact_date.lt.${cutoff}`)
            .limit(5);
          return (data ?? []).map((c) => ({
            id: c.id,
            title: c.company_name,
            subtitle: c.last_contact_date ? `Last: ${new Date(c.last_contact_date).toLocaleDateString()}` : 'Never contacted',
            action: { label: 'Mark contacted', icon: Phone, run: () => markContacted(c.id) },
          }));
        },
      };
    case 'support':
      return {
        label: 'Open tickets',
        description: 'Tickets still open, in progress, or awaiting client.',
        targetTab: 'tickets',
        fetch: async () => {
          const { data } = await supabase
            .from('tickets')
            .select('id, title, priority, status')
            .in('status', ['open', 'in_progress', 'waiting_on_client'])
            .eq('archived', false)
            .order('created_at', { ascending: true })
            .limit(5);
          return (data ?? []).map((t) => ({ id: t.id, title: t.title, subtitle: `${t.priority} · ${t.status}` }));
        },
      };
    case 'product_dev':
    case 'engineering':
      return {
        label: 'Open bug / engineering tickets',
        description: 'Issues routed to the product / dev team.',
        targetTab: 'tickets',
        fetch: async () => {
          const { data } = await supabase
            .from('tickets')
            .select('id, title, priority, category')
            .in('category', ['bug', 'engineering', 'feature'])
            .not('status', 'in', '(resolved,closed)')
            .eq('archived', false)
            .order('created_at', { ascending: true })
            .limit(5);
          return (data ?? []).map((t) => ({ id: t.id, title: t.title, subtitle: `${t.category} · ${t.priority}` }));
        },
      };
    default:
      return null;
  }
};

const adminQueue = (): QueueConfig => ({
  label: 'Cross-team bottlenecks',
  description: 'Where work is stuck across the pipeline right now.',
  targetTab: 'clients',
  fetch: async () => {
    const items: QueueItem[] = [];
    const cutoff14 = new Date(Date.now() - 14 * 86400_000).toISOString();
    const cutoff30 = new Date(Date.now() - 30 * 86400_000).toISOString();

    const [kyc, verified, churn, sla] = await Promise.all([
      supabase.from('clients').select('id', { count: 'exact', head: true }).in('stage', ['KYC Submitted', 'KYC Review']).eq('archived', false),
      supabase.from('clients').select('id', { count: 'exact', head: true }).eq('stage', 'Verified').eq('archived', false).lt('updated_at', cutoff14),
      supabase.from('clients').select('id', { count: 'exact', head: true }).eq('stage', 'Active').eq('archived', false).or(`last_contact_date.is.null,last_contact_date.lt.${cutoff30}`),
      supabase.from('tickets').select('id', { count: 'exact', head: true }).not('due_date', 'is', null).lt('due_date', new Date().toISOString()).not('status', 'in', '(resolved,closed)').eq('archived', false),
    ]);

    if ((kyc.count ?? 0) > 0) items.push({ id: 'kyc', title: `${kyc.count} customers pending KYC review`, subtitle: 'Compliance' });
    if ((verified.count ?? 0) > 0) items.push({ id: 'ver', title: `${verified.count} verified customers stuck >14 days`, subtitle: 'Onboarding' });
    if ((churn.count ?? 0) > 0) items.push({ id: 'churn', title: `${churn.count} active customers at churn risk`, subtitle: 'Customer Success' });
    if ((sla.count ?? 0) > 0) items.push({ id: 'sla', title: `${sla.count} tickets past SLA`, subtitle: 'Support' });
    return items;
  },
});

export function AttentionQueue({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const { department, role } = useAuth();
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);
  const config = role === 'admin' ? adminQueue() : queueFor(department, role, refresh);

  useEffect(() => {
    if (!config) { setLoading(false); return; }
    let cancelled = false;
    config.fetch().then((r) => {
      if (!cancelled) { setItems(r); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, [department, role, tick]);

  if (!config) return null;
  if (loading) return <div className="mx-4 mt-4 h-24 rounded-xl border bg-card animate-pulse" />;
  if (items.length === 0) return null;

  return (
    <div className="mx-4 mt-4 rounded-xl border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-primary" />
          <div>
            <p className="text-sm font-semibold">Needs your attention · {config.label}</p>
            <p className="text-xs text-muted-foreground">{config.description}</p>
          </div>
        </div>
        {onNavigate && (
          <button
            onClick={() => onNavigate(config.targetTab)}
            className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            View all <ArrowRight className="h-3 w-3" />
          </button>
        )}
      </div>
      <ul className="divide-y">
        {items.map((it) => {
          const Icon = it.action?.icon;
          return (
            <li key={it.id} className="px-4 py-2.5 flex items-center justify-between text-sm gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{it.title}</p>
                {it.subtitle && <p className="text-xs text-muted-foreground">{it.subtitle}</p>}
              </div>
              {it.action && (
                <button
                  onClick={it.action.run}
                  className="shrink-0 inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/10"
                >
                  {Icon && <Icon className="h-3 w-3" />}
                  {it.action.label}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
