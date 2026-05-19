import { useEffect, useState } from 'react';
import { AlertCircle, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth, AppDepartment } from '@/hooks/useAuth';

type QueueItem = { id: string; title: string; subtitle?: string };
type QueueConfig = {
  label: string;
  description: string;
  targetTab: string;
  fetch: () => Promise<QueueItem[]>;
};

const queueFor = (dept: AppDepartment | null, role: string | null): QueueConfig | null => {
  // Admins/managers see no single fixed queue (they roam all modules)
  if (!dept) return null;

  switch (dept) {
    case 'compliance':
      return {
        label: 'Pending KYC reviews',
        description: 'Clients waiting for compliance to review their documents.',
        targetTab: 'clients',
        fetch: async () => {
          const { data } = await supabase
            .from('clients')
            .select('id, company_name, stage, created_at')
            .in('stage', ['KYC Submitted', 'KYC Review'])
            .eq('archived', false)
            .order('created_at', { ascending: true })
            .limit(5);
          return (data ?? []).map((c) => ({ id: c.id, title: c.company_name, subtitle: c.stage }));
        },
      };
    case 'onboarding':
      return {
        label: 'Verified — ready to onboard',
        description: 'Clients passed compliance and are waiting for onboarding.',
        targetTab: 'clients',
        fetch: async () => {
          const { data } = await supabase
            .from('clients')
            .select('id, company_name, country')
            .eq('stage', 'Verified')
            .eq('archived', false)
            .order('created_at', { ascending: true })
            .limit(5);
          return (data ?? []).map((c) => ({ id: c.id, title: c.company_name, subtitle: c.country }));
        },
      };
    case 'sales':
      return {
        label: 'Leads needing contact',
        description: 'New leads that have not been moved forward yet.',
        targetTab: 'sales',
        fetch: async () => {
          const { data } = await supabase
            .from('clients')
            .select('id, company_name, created_at')
            .eq('stage', 'Lead')
            .eq('archived', false)
            .order('created_at', { ascending: true })
            .limit(5);
          return (data ?? []).map((c) => ({ id: c.id, title: c.company_name, subtitle: new Date(c.created_at).toLocaleDateString() }));
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
    case 'finance':
    case 'operations':
      return {
        label: 'Billing tickets',
        description: 'Open finance / billing requests.',
        targetTab: 'tickets',
        fetch: async () => {
          const { data } = await supabase
            .from('tickets')
            .select('id, title, priority')
            .eq('category', 'billing')
            .not('status', 'in', '(resolved,closed)')
            .eq('archived', false)
            .limit(5);
          return (data ?? []).map((t) => ({ id: t.id, title: t.title, subtitle: t.priority }));
        },
      };
    default:
      return null;
  }
};

export function AttentionQueue({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const { department, role } = useAuth();
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const config = queueFor(department, role);

  useEffect(() => {
    if (!config) { setLoading(false); return; }
    let cancelled = false;
    config.fetch().then((r) => {
      if (!cancelled) { setItems(r); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, [department]);

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
        {items.map((it) => (
          <li key={it.id} className="px-4 py-2.5 flex items-center justify-between text-sm">
            <span className="font-medium truncate">{it.title}</span>
            {it.subtitle && <span className="text-xs text-muted-foreground ml-3 shrink-0">{it.subtitle}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
