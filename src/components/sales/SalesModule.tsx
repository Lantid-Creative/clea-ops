import { useState } from 'react';
import { Search, Plus, DollarSign, TrendingUp, Users, Award, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { StatCard } from '@/components/layout/StatCard';
import { Deal, DealStage, DEAL_STAGES } from '@/lib/types';
import { formatCurrency } from '@/lib/helpers';
import { mockDeals, mockEmployees, defaultSalesSettings } from '@/lib/mock-data';
import { toast } from 'sonner';

type ViewMode = 'pipeline' | 'team';

export function SalesModule({ canEdit = true }: { canEdit?: boolean }) {
  const [deals, setDeals] = useState<Deal[]>(mockDeals);
  const [viewMode, setViewMode] = useState<ViewMode>('pipeline');
  const [showAddForm, setShowAddForm] = useState(false);
  const [settings] = useState(defaultSalesSettings);
  const [reasonPrompt, setReasonPrompt] = useState<{ deal: Deal; newStage: DealStage } | null>(null);
  const [reasonText, setReasonText] = useState('');

  const totalPipeline = deals.filter((d) => d.stage !== 'Lost').reduce((s, d) => s + d.deal_value, 0);
  const wonValue = deals.filter((d) => d.stage === 'Won').reduce((s, d) => s + d.deal_value, 0);
  const avgDeal = deals.length > 0 ? totalPipeline / deals.filter((d) => d.stage !== 'Lost').length : 0;
  const winRate = deals.length > 0 ? Math.round((deals.filter((d) => d.stage === 'Won').length / Math.max(1, deals.filter(d => d.stage === 'Won' || d.stage === 'Lost').length)) * 100) : 0;

  const handleAdd = (data: Partial<Deal>) => {
    const newDeal: Deal = {
      id: String(Date.now()),
      company: data.company || '',
      contact: data.contact || '',
      deal_value: data.deal_value || 0,
      assigned_bdm: data.assigned_bdm || '',
      probability: data.probability || 0,
      next_action: data.next_action || '',
      due_date: data.due_date || '',
      stage: 'Prospect',
      created_at: new Date().toISOString(),
    };
    setDeals([newDeal, ...deals]);
    setShowAddForm(false);
    toast.success('Deal added successfully');
  };

  const changeStage = (dealId: string, newStage: DealStage) => {
    const deal = deals.find((d) => d.id === dealId);
    if (!deal) return;
    if (newStage === 'Won' || newStage === 'Lost') {
      setReasonPrompt({ deal, newStage });
      setReasonText('');
      return;
    }
    setDeals(deals.map((d) => d.id === dealId ? { ...d, stage: newStage } : d));
    toast.success(`Deal moved to ${newStage}`);
  };

  const confirmReason = () => {
    if (!reasonPrompt) return;
    const { deal, newStage } = reasonPrompt;
    setDeals(deals.map((d) => d.id === deal.id ? { ...d, stage: newStage, won_lost_reason: reasonText } : d));
    toast.success(`Deal marked ${newStage}${reasonText ? ` · ${reasonText}` : ''}`);
    setReasonPrompt(null);
  };

  // Team performance data
  const salesTeam = mockEmployees.filter((e) => e.department === 'Sales');
  const teamPerformance = salesTeam.map((member) => {
    const memberDeals = deals.filter((d) => d.assigned_bdm === member.name);
    const pipelineValue = memberDeals.filter((d) => d.stage !== 'Lost').reduce((s, d) => s + d.deal_value, 0);
    const memberWonValue = memberDeals.filter((d) => d.stage === 'Won').reduce((s, d) => s + d.deal_value, 0);
    const commission = settings.base_retainer + (memberWonValue * settings.commission_percentage / 100);
    return { ...member, pipelineValue, wonValue: memberWonValue, commission, target: settings.monthly_target };
  });

  return (
    <div className="p-4 space-y-4">
      {/* VP Summary */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard title="Total Pipeline" value={formatCurrency(totalPipeline)} icon={<BarChart3 className="h-5 w-5" />} trend={{ value: 18, positive: true }} />
        <StatCard title="Won Revenue" value={formatCurrency(wonValue)} icon={<DollarSign className="h-5 w-5" />} trend={{ value: 25, positive: true }} />
        <StatCard title="Avg Deal Size" value={formatCurrency(avgDeal)} icon={<TrendingUp className="h-5 w-5" />} />
        <StatCard title="Win Rate" value={`${winRate}%`} icon={<Award className="h-5 w-5" />} trend={{ value: 5, positive: true }} />
      </div>

      {/* View Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex rounded-lg border bg-card p-1">
          <button onClick={() => setViewMode('pipeline')} className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${viewMode === 'pipeline' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>Pipeline View</button>
          <button onClick={() => setViewMode('team')} className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${viewMode === 'team' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>Team Performance</button>
        </div>
        {canEdit && (
          <Button onClick={() => setShowAddForm(true)} size="sm">
            <Plus className="mr-1 h-4 w-4" /> Add Deal
          </Button>
        )}
      </div>

      {viewMode === 'pipeline' ? (
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          {DEAL_STAGES.map((stage) => {
            const stageDeals = deals.filter((d) => d.stage === stage);
            return (
              <div key={stage} className="space-y-2">
                <div className="flex items-center justify-between rounded-lg bg-card border p-2">
                  <span className="text-sm font-semibold">{stage}</span>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{stageDeals.length}</span>
                </div>
                <div className="space-y-2">
                  {stageDeals.map((deal) => (
                    <div key={deal.id} className="stat-card space-y-1.5 text-sm">
                      <h4 className="font-semibold leading-tight">{deal.company}</h4>
                      <p className="text-muted-foreground">{deal.contact}</p>
                      <p className="font-bold text-primary">{formatCurrency(deal.deal_value)}</p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{deal.assigned_bdm.split(' ')[0]}</span>
                        <span>{deal.probability}%</span>
                      </div>
                      <Select value={deal.stage} onValueChange={(v) => changeStage(deal.id, v as DealStage)}>
                        <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {DEAL_STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {teamPerformance.map((member) => {
            const progress = Math.min(100, Math.round((member.wonValue / member.target) * 100));
            return (
              <div key={member.id} className="stat-card space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-dept-sales/10 font-semibold text-dept-sales">
                    {member.name.split(' ').map((n) => n[0]).join('')}
                  </div>
                  <div>
                    <h3 className="font-semibold">{member.name}</h3>
                    <p className="text-sm text-muted-foreground">{member.role}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Pipeline</p>
                    <p className="font-bold">{formatCurrency(member.pipelineValue)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Won</p>
                    <p className="font-bold text-success">{formatCurrency(member.wonValue)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Commission</p>
                    <p className="font-bold text-primary">{formatCurrency(member.commission)}</p>
                  </div>
                </div>
                <div>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="text-muted-foreground">Monthly Target</span>
                    <span className="font-medium">{progress}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-border">
                    <div className={`h-full rounded-full bg-primary transition-all`} style={{ width: `${progress}%` }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Deal Modal */}
      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add New Deal</DialogTitle></DialogHeader>
          <AddDealForm onSubmit={handleAdd} onCancel={() => setShowAddForm(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AddDealForm({ onSubmit, onCancel }: { onSubmit: (d: Partial<Deal>) => void; onCancel: () => void }) {
  const [form, setForm] = useState({ company: '', contact: '', deal_value: '', assigned_bdm: '', probability: '', next_action: '', due_date: '' });
  const update = (k: string, v: string) => setForm({ ...form, [k]: v });

  return (
    <div className="space-y-3">
      {[
        { key: 'company', label: 'Company', type: 'text' },
        { key: 'contact', label: 'Contact', type: 'text' },
        { key: 'deal_value', label: 'Deal Value (USD)', type: 'number' },
        { key: 'assigned_bdm', label: 'Assigned BDM', type: 'text' },
        { key: 'probability', label: 'Probability (%)', type: 'number' },
        { key: 'next_action', label: 'Next Action', type: 'text' },
        { key: 'due_date', label: 'Due Date', type: 'date' },
      ].map(({ key, label, type }) => (
        <div key={key}>
          <Label className="text-sm">{label}</Label>
          <Input type={type} value={(form as any)[key]} onChange={(e) => update(key, e.target.value)} className="mt-1" />
        </div>
      ))}
      <div className="flex gap-2 pt-2">
        <Button variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>
        <Button onClick={() => onSubmit({ ...form, deal_value: Number(form.deal_value), probability: Number(form.probability) })} className="flex-1" disabled={!form.company}>Add Deal</Button>
      </div>
    </div>
  );
}
