import { useEffect, useState } from 'react';
import { AlertCircle, ArrowRight, Check, Phone, FileCheck, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth, AppDepartment } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';

type QueueItem = { id: string; title: string; subtitle?: string; action?: { label: string; icon: any; run: () => Promise<unknown> } };
export type NavFilter = { stage?: string; status?: string };
type QueueConfig = {
  label: string;
  description: string;
  fetch: (limit: number) => Promise<QueueItem[]>;
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
        fetch: async (limit) => {
          const { data } = await supabase
            .from('clients')
            .select('id, company_name, stage, created_at')
            .in('stage', ['KYC Submitted', 'KYC Review'])
            .eq('archived', false)
            .order('created_at', { ascending: true })
            .limit(limit);
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
        fetch: async (limit) => {
          const { data } = await supabase
            .from('clients')
            .select('id, company_name, country')
            .eq('stage', 'Verified')
            .eq('archived', false)
            .order('created_at', { ascending: true })
            .limit(limit);
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
        fetch: async (limit) => {
          const { data } = await supabase
            .from('clients')
            .select('id, company_name, created_at')
            .eq('stage', 'Lead')
            .eq('archived', false)
            .order('created_at', { ascending: true })
            .limit(limit);
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
        fetch: async (limit) => {
          const cutoff = new Date(Date.now() - 30 * 86400_000).toISOString();
          const { data } = await supabase
            .from('clients')
            .select('id, company_name, last_contact_date')
            .eq('stage', 'Active')
            .eq('archived', false)
            .or(`last_contact_date.is.null,last_contact_date.lt.${cutoff}`)
            .limit(limit);
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
        fetch: async (limit) => {
          const { data } = await supabase
            .from('tickets')
            .select('id, title, priority, status')
            .in('status', ['open', 'in_progress', 'waiting_on_client'])
            .eq('archived', false)
            .order('created_at', { ascending: true })
            .limit(limit);
          return (data ?? []).map((t) => ({ id: t.id, title: t.title, subtitle: `${t.priority} · ${t.status}` }));
        },
      };
    case 'product_dev':
    case 'engineering':
      return {
        label: 'Open bug / engineering tickets',
        description: 'Issues routed to the product / dev team.',
        fetch: async (limit) => {
          const { data } = await supabase
            .from('tickets')
            .select('id, title, priority, category')
            .in('category', ['bug', 'engineering', 'feature'])
            .not('status', 'in', '(resolved,closed)')
            .eq('archived', false)
            .order('created_at', { ascending: true })
            .limit(limit);
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

const PREVIEW_LIMIT = 5;
const FULL_LIMIT = 100;

function QueueRow({ item }: { item: QueueItem }) {
  const Icon = item.action?.icon;
  return (
    <li className="px-4 py-2.5 flex items-center justify-between text-sm gap-3">
      <div className="min-w-0 flex-1">
        <p className="font-medium truncate">{item.title}</p>
        {item.subtitle && <p className="text-xs text-muted-foreground">{item.subtitle}</p>}
      </div>
      {item.action && (
        <button
          onClick={item.action.run}
          className="shrink-0 inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/10"
        >
          {Icon && <Icon className="h-3 w-3" />}
          {item.action.label}
        </button>
      )}
    </li>
  );
}

export function AttentionQueue() {
  const { department, role } = useAuth();
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [allItems, setAllItems] = useState<QueueItem[] | null>(null);
  const [allLoading, setAllLoading] = useState(false);
  const refresh = () => setTick((t) => t + 1);
  const config = role === 'admin' ? adminQueue() : queueFor(department, role, refresh);

  useEffect(() => {
    if (!config) { setLoading(false); return; }
    let cancelled = false;
    config.fetch(PREVIEW_LIMIT).then((r) => {
      if (!cancelled) { setItems(r); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, [department, role, tick]);

  const openAll = async () => {
    if (!config) return;
    setSheetOpen(true);
    setAllLoading(true);
    const r = await config.fetch(FULL_LIMIT);
    setAllItems(r);
    setAllLoading(false);
  };

  // Refetch full list when an inline action triggers refresh while sheet is open
  useEffect(() => {
    if (!sheetOpen || !config) return;
    let cancelled = false;
    setAllLoading(true);
    config.fetch(FULL_LIMIT).then((r) => {
      if (!cancelled) { setAllItems(r); setAllLoading(false); }
    });
    return () => { cancelled = true; };
  }, [tick]);

  if (!config) return null;
  if (loading) return <div className="mx-4 mt-4 h-24 rounded-xl border bg-card animate-pulse" />;
  if (items.length === 0) return null;

  return (
    <>
      <div className="mx-4 mt-4 rounded-xl border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-primary" />
            <div>
              <p className="text-sm font-semibold">Needs your attention · {config.label}</p>
              <p className="text-xs text-muted-foreground">{config.description}</p>
            </div>
          </div>
          <button
            onClick={openAll}
            className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            View all <ArrowRight className="h-3 w-3" />
          </button>
        </div>
        <ul className="divide-y">
          {items.map((it) => <QueueRow key={it.id} item={it} />)}
        </ul>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col">
          <SheetHeader className="px-4 py-4 border-b">
            <SheetTitle>{config.label}</SheetTitle>
            <SheetDescription>{config.description}</SheetDescription>
          </SheetHeader>
          <ScrollArea className="flex-1">
            {allLoading && !allItems ? (
              <div className="p-4 text-sm text-muted-foreground">Loading…</div>
            ) : !allItems || allItems.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">Nothing pending. 🎉</div>
            ) : (
              <ul className="divide-y">
                {allItems.map((it) => <QueueRow key={it.id} item={it} />)}
              </ul>
            )}
          </ScrollArea>
          {allItems && allItems.length > 0 && (
            <div className="px-4 py-2 border-t text-xs text-muted-foreground">
              Showing {allItems.length} item{allItems.length === 1 ? '' : 's'}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
