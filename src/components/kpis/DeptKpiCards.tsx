import { useKpis, KpiDept, KpiRange } from '@/hooks/useKpis';
import { formatCurrency, formatNumber } from '@/lib/helpers';

const METRICS: Record<KpiDept, Array<{ key: string; label: string; format?: 'currency' | 'pct' | 'num' | 'hours' | 'mins' | 'days' }>> = {
  support: [
    { key: 'tickets_opened', label: 'Tickets Opened' },
    { key: 'tickets_closed', label: 'Tickets Closed' },
    { key: 'open_backlog', label: 'Open Backlog' },
    { key: 'avg_first_response_minutes', label: 'Avg First Response', format: 'mins' },
    { key: 'avg_resolution_hours', label: 'Avg Resolution', format: 'hours' },
    { key: 'sla_breaches', label: 'SLA Breaches' },
  ],
  sales: [
    { key: 'new_leads', label: 'New Leads' },
    { key: 'leads_contacted', label: 'Leads Contacted' },
    { key: 'converted_to_active', label: 'Converted to Active' },
    { key: 'conversion_rate_pct', label: 'Conversion Rate', format: 'pct' },
    { key: 'active_transacting', label: 'Active Transacting' },
    { key: 'total_volume', label: 'Total Volume', format: 'currency' },
  ],
  compliance: [
    { key: 'kyc_submitted', label: 'KYC Submitted' },
    { key: 'kyc_verified', label: 'KYC Verified' },
    { key: 'pending_review', label: 'Pending Review' },
    { key: 'avg_turnaround_hours', label: 'Avg Turnaround', format: 'hours' },
  ],
  onboarding: [
    { key: 'onboarded', label: 'Customers Onboarded' },
    { key: 'avg_verified_to_onboarded_days', label: 'Verified → Onboarded', format: 'days' },
    { key: 'drop_offs', label: 'Drop-offs (>14d)' },
    { key: 'queue_size', label: 'In Queue' },
  ],
  cs: [
    { key: 'engaged_this_period', label: 'Engaged This Period' },
    { key: 'follow_ups_pending', label: 'Follow-ups Pending' },
    { key: 'churn_risk', label: 'Churn Risk' },
    { key: 'active_customers', label: 'Active Customers' },
  ],
  finance: [
    { key: 'total_volume', label: 'Total Volume', format: 'currency' },
    { key: 'active_count', label: 'Active Customers' },
  ],
  product: [
    { key: 'bugs_opened', label: 'Bugs Opened' },
    { key: 'bugs_closed', label: 'Bugs Closed' },
    { key: 'open_bugs', label: 'Open Bugs' },
    { key: 'features_requested', label: 'Features Requested' },
  ],
};

function fmt(v: any, type?: string) {
  if (v === null || v === undefined) return '—';
  if (type === 'currency') return formatCurrency(Number(v));
  if (type === 'pct') return `${v}%`;
  if (type === 'hours') return `${v}h`;
  if (type === 'mins') return `${v}m`;
  if (type === 'days') return `${v}d`;
  return formatNumber(Number(v));
}

export function DeptKpiCards({ dept, range = 'this_month', compact = false }: { dept: KpiDept; range?: KpiRange; compact?: boolean }) {
  const { data, loading } = useKpis(dept, range);
  const metrics = METRICS[dept];

  if (loading) {
    return (
      <div className={`grid gap-3 ${compact ? 'grid-cols-3' : 'sm:grid-cols-2 lg:grid-cols-3'}`}>
        {metrics.map((m) => (
          <div key={m.key} className="h-20 rounded-lg border bg-card animate-pulse" />
        ))}
      </div>
    );
  }

  const shown = compact ? metrics.slice(0, 3) : metrics;

  return (
    <div className={`grid gap-3 ${compact ? 'grid-cols-3' : 'sm:grid-cols-2 lg:grid-cols-3'}`}>
      {shown.map((m) => (
        <div key={m.key} className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">{m.label}</p>
          <p className="text-2xl font-bold">{fmt(data?.[m.key], m.format)}</p>
        </div>
      ))}
    </div>
  );
}
