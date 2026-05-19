import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type KpiDept = 'support' | 'sales' | 'compliance' | 'onboarding' | 'cs' | 'finance' | 'product';

const RPC_MAP: Record<KpiDept, 'kpi_support' | 'kpi_sales' | 'kpi_compliance' | 'kpi_onboarding' | 'kpi_cs' | 'kpi_finance' | 'kpi_product'> = {
  support: 'kpi_support',
  sales: 'kpi_sales',
  compliance: 'kpi_compliance',
  onboarding: 'kpi_onboarding',
  cs: 'kpi_cs',
  finance: 'kpi_finance',
  product: 'kpi_product',
};

export type KpiRange = 'this_month' | 'last_month' | 'this_quarter';

export function rangeBounds(r: KpiRange): { from: Date; to: Date } {
  const now = new Date();
  if (r === 'this_month') {
    return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: new Date(now.getFullYear(), now.getMonth() + 1, 1) };
  }
  if (r === 'last_month') {
    return { from: new Date(now.getFullYear(), now.getMonth() - 1, 1), to: new Date(now.getFullYear(), now.getMonth(), 1) };
  }
  const q = Math.floor(now.getMonth() / 3);
  return { from: new Date(now.getFullYear(), q * 3, 1), to: new Date(now.getFullYear(), q * 3 + 3, 1) };
}

export function useKpis(dept: KpiDept, range: KpiRange = 'this_month') {
  const [data, setData] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const { from, to } = rangeBounds(range);
    supabase
      .rpc(RPC_MAP[dept], { p_from: from.toISOString(), p_to: to.toISOString() })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) setError(error.message);
        else setData((data as any) ?? {});
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [dept, range]);

  return { data, loading, error };
}
