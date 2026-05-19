import { useState } from 'react';
import { Target } from 'lucide-react';
import { HowToGuide } from '@/components/layout/HowToGuide';
import { useAuth, AppDepartment } from '@/hooks/useAuth';
import { DeptKpiCards } from './DeptKpiCards';
import { KpiDept, KpiRange } from '@/hooks/useKpis';

const DEPT_TABS: Array<{ key: KpiDept; label: string }> = [
  { key: 'sales', label: 'Sales' },
  { key: 'support', label: 'Support' },
  { key: 'compliance', label: 'Compliance' },
  { key: 'onboarding', label: 'Onboarding' },
  { key: 'cs', label: 'Customer Success' },
  { key: 'finance', label: 'Finance' },
  { key: 'product', label: 'Product / Dev' },
];

// Map a user's department to the KPI tab they own
const DEPT_TO_KPI: Partial<Record<AppDepartment, KpiDept>> = {
  sales: 'sales',
  support: 'support',
  compliance: 'compliance',
  onboarding: 'onboarding',
  customer_success: 'cs',
  finance: 'finance',
  product_dev: 'product',
  engineering: 'product',
  operations: 'finance',
};

const RANGES: Array<{ key: KpiRange; label: string }> = [
  { key: 'this_month', label: 'This Month' },
  { key: 'last_month', label: 'Last Month' },
  { key: 'this_quarter', label: 'This Quarter' },
];

export function KpisModule() {
  const { role, department } = useAuth();
  const isPrivileged = role === 'admin' || role === 'manager';
  const ownDept = department ? DEPT_TO_KPI[department] ?? null : null;
  const initial: KpiDept = isPrivileged ? 'sales' : (ownDept ?? 'sales');

  const [activeDept, setActiveDept] = useState<KpiDept>(initial);
  const [range, setRange] = useState<KpiRange>('this_month');

  const visibleTabs = isPrivileged
    ? DEPT_TABS
    : DEPT_TABS.filter((t) => t.key === ownDept);

  return (
    <div className="p-4 space-y-6">
      <div className="rounded-xl border bg-gradient-to-br from-primary/5 to-primary/10 p-5">
        <div className="flex items-center gap-2 mb-2">
          <Target className="h-5 w-5 text-primary" />
          <h2 className="font-bold text-lg">Live KPIs</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Computed from real tickets and clients. Updates as your team works.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {visibleTabs.map((d) => (
            <button
              key={d.key}
              onClick={() => setActiveDept(d.key)}
              className={`pipeline-btn ${activeDept === d.key ? 'pipeline-btn-active' : 'bg-card text-muted-foreground border-border hover:bg-accent'}`}
            >
              {d.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1 rounded-lg border bg-card p-1">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`px-3 py-1.5 text-xs rounded-md transition ${range === r.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'}`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <DeptKpiCards dept={activeDept} range={range} />
    </div>
  );
}
