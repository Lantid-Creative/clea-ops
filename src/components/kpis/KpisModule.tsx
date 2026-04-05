import { useState } from 'react';
import { Target, TrendingUp, Users, ArrowRight } from 'lucide-react';
import { StatCard } from '@/components/layout/StatCard';
import { Input } from '@/components/ui/input';
import { Department, DEPARTMENTS, DEPT_COLORS, KpiTarget } from '@/lib/types';
import { formatCurrency, formatNumber, getProgressColor, getProgressTextColor } from '@/lib/helpers';
import { mockKpis, mockEmployees, companyTarget } from '@/lib/mock-data';

export function KpisModule() {
  const [kpis, setKpis] = useState<KpiTarget[]>(mockKpis);
  const [activeDept, setActiveDept] = useState<Department>('Sales');

  const progress = Math.round((companyTarget.current / companyTarget.target) * 100);
  const transactionsNeeded = Math.ceil(companyTarget.target / companyTarget.avgTransactionSize);
  const activeUsersNeeded = Math.ceil(transactionsNeeded / 4);
  const monthlySignupsNeeded = Math.ceil(activeUsersNeeded / 10);

  const deptKpis = kpis.filter((k) => k.department === activeDept);
  const deptEmployees = mockEmployees.filter((e) => e.department === activeDept);

  const updateKpi = (id: string, field: 'target_value' | 'current_value', value: number) => {
    setKpis(kpis.map((k) => k.id === id ? { ...k, [field]: value } : k));
  };

  return (
    <div className="p-4 space-y-6">
      {/* North Star Metric */}
      <div className="rounded-xl border bg-gradient-to-br from-primary/5 to-primary/10 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Target className="h-5 w-5 text-primary" />
          <h2 className="font-bold text-lg">North Star: {companyTarget.metric}</h2>
        </div>
        <div className="flex items-end gap-2 mb-3">
          <span className="text-3xl font-bold">{formatCurrency(companyTarget.current)}</span>
          <span className="text-muted-foreground text-sm mb-1">/ {formatCurrency(companyTarget.target)}</span>
        </div>
        <div className="mb-4 h-3 rounded-full bg-border overflow-hidden">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Avg Transaction', value: formatCurrency(companyTarget.avgTransactionSize) },
            { label: 'Transactions Needed', value: formatNumber(transactionsNeeded) },
            { label: 'Active Users Required', value: formatNumber(activeUsersNeeded) },
            { label: 'Monthly Sign-ups', value: formatNumber(monthlySignupsNeeded) },
          ].map((item, i) => (
            <div key={i} className="rounded-lg bg-card border p-3">
              <p className="text-xs text-muted-foreground mb-0.5">{item.label}</p>
              <p className="font-bold">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Department Tabs */}
      <div className="flex flex-wrap gap-2">
        {DEPARTMENTS.map((dept) => (
          <button
            key={dept}
            onClick={() => setActiveDept(dept)}
            className={`pipeline-btn ${activeDept === dept ? 'pipeline-btn-active' : 'bg-card text-muted-foreground border-border hover:bg-accent'}`}
          >
            {dept}
          </button>
        ))}
      </div>

      {/* KPI Table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Metric</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Target</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Current</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground min-w-[120px]">Progress</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">%</th>
              </tr>
            </thead>
            <tbody>
              {deptKpis.map((kpi) => {
                const pct = kpi.target_value > 0 ? Math.round((kpi.current_value / kpi.target_value) * 100) : 0;
                return (
                  <tr key={kpi.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">{kpi.metric_name}</td>
                    <td className="px-4 py-3 text-right">
                      <Input type="number" value={kpi.target_value} onChange={(e) => updateKpi(kpi.id, 'target_value', Number(e.target.value))} className="h-7 w-24 text-right text-sm ml-auto" />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Input type="number" value={kpi.current_value} onChange={(e) => updateKpi(kpi.id, 'current_value', Number(e.target.value))} className="h-7 w-24 text-right text-sm ml-auto" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-2 rounded-full bg-border">
                        <div className={`h-full rounded-full transition-all ${getProgressColor(pct)}`} style={{ width: `${Math.min(100, pct)}%` }} />
                      </div>
                    </td>
                    <td className={`px-4 py-3 text-right font-bold ${getProgressTextColor(pct)}`}>{pct}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Team Members */}
      <div>
        <h3 className="mb-3 font-semibold">{activeDept} Team ({deptEmployees.length})</h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {deptEmployees.map((emp) => (
            <div key={emp.id} className="flex items-center gap-3 rounded-lg border bg-card p-3">
              <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold ${DEPT_COLORS[activeDept]}`}>
                {emp.name.split(' ').map((n) => n[0]).join('')}
              </div>
              <div>
                <p className="font-medium text-sm">{emp.name}</p>
                <p className="text-xs text-muted-foreground">{emp.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
