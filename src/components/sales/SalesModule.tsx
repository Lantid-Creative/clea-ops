import { useEffect, useMemo, useState } from 'react';
import { DollarSign, TrendingUp, Users, Award, BarChart3, Target } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatCard } from '@/components/layout/StatCard';
import { HowToGuide } from '@/components/layout/HowToGuide';
import { Client, ClientStage, CLIENT_STAGES } from '@/lib/types';
import { formatCurrency } from '@/lib/helpers';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type ViewMode = 'pipeline' | 'team';

// Sales pipeline = pre-revenue stages. Active = won. Archived w/ won_lost_reason = lost.
const PIPELINE_STAGES: ClientStage[] = ['Lead', 'KYC Submitted', 'KYC Review', 'Verified', 'Onboarded'];

interface SalesMember {
  user_id: string;
  full_name: string;
}

export function SalesModule({ canEdit = true }: { canEdit?: boolean }) {
  const [clients, setClients] = useState<Client[]>([]);
  const [lostClients, setLostClients] = useState<Client[]>([]);
  const [salesTeam, setSalesTeam] = useState<SalesMember[]>([]);
  const [kpi, setKpi] = useState<any>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('pipeline');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const from = new Date(); from.setDate(from.getDate() - 30);
    const to = new Date();

    const [activeRes, lostRes, rolesRes, kpiRes] = await Promise.all([
      supabase.from('clients').select('*').eq('archived', false).order('created_at', { ascending: false }),
      supabase.from('clients').select('*').eq('archived', true).not('won_lost_reason', 'eq', '').order('closed_at', { ascending: false }).limit(50),
      supabase.from('user_roles').select('user_id').eq('department', 'sales').eq('is_active', true),
      supabase.rpc('kpi_sales', { p_from: from.toISOString(), p_to: to.toISOString() }),
    ]);

    if (activeRes.error) toast.error(activeRes.error.message);
    setClients((activeRes.data ?? []) as Client[]);
    setLostClients((lostRes.data ?? []) as Client[]);
    setKpi(kpiRes.data ?? {});

    const ids = (rolesRes.data ?? []).map((r: any) => r.user_id);
    if (ids.length) {
      const { data: profs } = await supabase.from('profiles').select('user_id, full_name').in('user_id', ids);
      setSalesTeam((profs ?? []).map((p: any) => ({ user_id: p.user_id, full_name: p.full_name || 'Unknown' })));
    } else {
      setSalesTeam([]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const changeStage = async (clientId: string, newStage: ClientStage) => {
    const { error } = await supabase.from('clients').update({ stage: newStage }).eq('id', clientId);
    if (error) return toast.error(error.message);
    toast.success(`Moved to ${newStage}`);
    load();
  };

  // KPI derived
  const pipelineCount = clients.filter((c) => PIPELINE_STAGES.includes(c.stage)).length;
  const wonClients = clients.filter((c) => c.stage === 'Active');
  const wonRevenue = wonClients.reduce((s, c) => s + Number(c.transaction_volume || 0), 0);
  const avgRevenue = wonClients.length ? wonRevenue / wonClients.length : 0;
  const conversionRate = kpi?.conversion_rate_pct ?? 0;

  // Team perf: group by assignee_id
  const teamPerformance = useMemo(() => {
    return salesTeam.map((m) => {
      const mine = clients.filter((c: any) => c.assignee_id === m.user_id);
      const pipeline = mine.filter((c) => PIPELINE_STAGES.includes(c.stage)).length;
      const won = mine.filter((c) => c.stage === 'Active');
      const wonVol = won.reduce((s, c) => s + Number(c.transaction_volume || 0), 0);
      const total = pipeline + won.length;
      const convRate = total ? Math.round((won.length / total) * 100) : 0;
      return { ...m, pipeline, wonCount: won.length, wonVol, convRate };
    }).sort((a, b) => b.wonVol - a.wonVol);
  }, [salesTeam, clients]);

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading sales data…</div>;

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-end"><HowToGuide module="sales" /></div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard title="Open Pipeline" value={String(pipelineCount)} icon={<BarChart3 className="h-5 w-5" />} />
        <StatCard title="Active Customers" value={String(wonClients.length)} icon={<Users className="h-5 w-5" />} />
        <StatCard title="Total Volume (Active)" value={formatCurrency(wonRevenue)} icon={<DollarSign className="h-5 w-5" />} />
        <StatCard title="Avg Volume / Customer" value={formatCurrency(avgRevenue)} icon={<TrendingUp className="h-5 w-5" />} />
        <StatCard title="Conversion (30d)" value={`${conversionRate}%`} icon={<Award className="h-5 w-5" />} />
      </div>

      {kpi && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MiniStat label="New Leads (30d)" value={kpi.new_leads ?? 0} />
          <MiniStat label="Leads Contacted (30d)" value={kpi.leads_contacted ?? 0} />
          <MiniStat label="Converted to Active (30d)" value={kpi.converted_to_active ?? 0} />
          <MiniStat label="Lost / Archived" value={lostClients.length} />
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex rounded-lg border bg-card p-1">
          <button onClick={() => setViewMode('pipeline')} className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${viewMode === 'pipeline' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>Pipeline View</button>
          <button onClick={() => setViewMode('team')} className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${viewMode === 'team' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>Team Performance</button>
        </div>
        <p className="text-xs text-muted-foreground">Add leads from the <span className="font-medium text-foreground">Clients</span> tab.</p>
      </div>

      {viewMode === 'pipeline' ? (
        <div className="-mx-4 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0">
          <div className="grid min-w-[1100px] grid-cols-6 gap-3">
            {CLIENT_STAGES.map((stage) => {
              const stageClients = clients.filter((c) => c.stage === stage);
              const stageVol = stageClients.reduce((s, c) => s + Number(c.transaction_volume || 0), 0);
              return (
                <div key={stage} className="space-y-2">
                  <div className="flex items-center justify-between rounded-lg bg-card border p-2">
                    <span className="text-sm font-semibold">{stage}</span>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{stageClients.length}</span>
                  </div>
                  {stage === 'Active' && stageVol > 0 && (
                    <div className="text-xs text-muted-foreground px-1">{formatCurrency(stageVol)} total</div>
                  )}
                  <div className="space-y-2">
                    {stageClients.slice(0, 25).map((c) => (
                      <div key={c.id} className="stat-card space-y-1.5 text-sm">
                        <h4 className="font-semibold leading-tight truncate">{c.company_name || c.contact_person || '—'}</h4>
                        <p className="text-muted-foreground truncate text-xs">{c.contact_person} · {c.country || '—'}</p>
                        {Number(c.transaction_volume) > 0 && (
                          <p className="font-bold text-primary">{formatCurrency(Number(c.transaction_volume))}</p>
                        )}
                        {canEdit ? (
                          <Select value={c.stage} onValueChange={(v) => changeStage(c.id, v as ClientStage)}>
                            <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {CLIENT_STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="text-xs text-muted-foreground">Read-only</div>
                        )}
                      </div>
                    ))}
                    {stageClients.length === 0 && (
                      <div className="rounded-lg border border-dashed p-3 text-center text-xs text-muted-foreground">Empty</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {teamPerformance.length === 0 && (
            <div className="col-span-full rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              No active users assigned to the Sales department yet. Assign them in Admin → User Management.
            </div>
          )}
          {teamPerformance.map((m) => (
            <div key={m.user_id} className="stat-card space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-dept-sales/10 font-semibold text-dept-sales">
                  {m.full_name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold truncate">{m.full_name}</h3>
                  <p className="text-xs text-muted-foreground">Sales</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-sm">
                <div><p className="text-muted-foreground text-xs">Pipeline</p><p className="font-bold">{m.pipeline}</p></div>
                <div><p className="text-muted-foreground text-xs">Active</p><p className="font-bold text-success">{m.wonCount}</p></div>
                <div><p className="text-muted-foreground text-xs">Conv %</p><p className="font-bold text-primary">{m.convRate}%</p></div>
              </div>
              <div className="rounded-md bg-muted/50 p-2 text-center">
                <p className="text-xs text-muted-foreground">Volume from Active</p>
                <p className="font-bold text-primary">{formatCurrency(m.wonVol)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {lostClients.length > 0 && viewMode === 'pipeline' && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold flex items-center gap-2"><Target className="h-4 w-4" /> Recently Lost / Archived</h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {lostClients.slice(0, 6).map((c) => (
              <div key={c.id} className="rounded-lg border bg-card p-3 text-sm">
                <div className="font-medium truncate">{c.company_name || c.contact_person}</div>
                <div className="text-xs text-muted-foreground truncate">{c.won_lost_reason || 'No reason recorded'}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-bold mt-1">{value}</p>
    </div>
  );
}
