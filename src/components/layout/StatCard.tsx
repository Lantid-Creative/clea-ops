import { ReactNode } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: { value: number; positive: boolean };
  className?: string;
}

export function StatCard({ title, value, icon, trend, className = '' }: StatCardProps) {
  return (
    <div className={`stat-card flex items-start justify-between ${className}`}>
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-2xl font-bold tracking-tight">{value}</p>
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-medium ${trend.positive ? 'text-success' : 'text-destructive'}`}>
            {trend.positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {trend.value}%
          </div>
        )}
      </div>
      <div className="rounded-lg bg-primary/10 p-2.5 text-primary">{icon}</div>
    </div>
  );
}
