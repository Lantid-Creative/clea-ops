export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

export function getProgressColor(percentage: number): string {
  if (percentage >= 90) return 'bg-success';
  if (percentage >= 70) return 'bg-primary';
  if (percentage >= 50) return 'bg-warning';
  return 'bg-destructive';
}

export function getProgressTextColor(percentage: number): string {
  if (percentage >= 90) return 'text-success';
  if (percentage >= 70) return 'text-primary';
  if (percentage >= 50) return 'text-warning';
  return 'text-destructive';
}
