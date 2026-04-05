import { useState } from 'react';
import { Search, Plus, Building2, CheckCircle2, Clock, DollarSign, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatCard } from '@/components/layout/StatCard';
import { Client, ClientStage, CLIENT_STAGES, KYC_DOCUMENTS } from '@/lib/types';
import { formatCurrency, formatNumber } from '@/lib/helpers';
import { mockClients } from '@/lib/mock-data';
import { toast } from 'sonner';

export function ClientsModule() {
  const [clients, setClients] = useState<Client[]>(mockClients);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<ClientStage | 'All'>('All');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const filtered = clients.filter((c) => {
    const matchSearch = !search || c.company_name.toLowerCase().includes(search.toLowerCase()) || c.contact_person.toLowerCase().includes(search.toLowerCase());
    const matchStage = stageFilter === 'All' || c.stage === stageFilter;
    return matchSearch && matchStage;
  });

  const stageCounts = CLIENT_STAGES.reduce((acc, s) => {
    acc[s] = clients.filter((c) => c.stage === s).length;
    return acc;
  }, {} as Record<ClientStage, number>);

  const totalVolume = clients.reduce((s, c) => s + c.transaction_volume, 0);
  const activeClients = clients.filter((c) => c.stage === 'Active').length;
  const pendingKyc = clients.filter((c) => c.stage === 'KYC Submitted' || c.stage === 'KYC Review').length;

  const handleAdd = (data: Partial<Client>) => {
    const newClient: Client = {
      id: String(Date.now()),
      company_name: data.company_name || '',
      contact_person: data.contact_person || '',
      email: data.email || '',
      phone: data.phone || '',
      country: data.country || '',
      industry: data.industry || '',
      assigned_specialist: data.assigned_specialist || '',
      stage: 'Lead',
      kyc_documents: Object.fromEntries(KYC_DOCUMENTS.map((d) => [d, false])),
      transaction_volume: 0,
      onboard_date: null,
      created_at: new Date().toISOString(),
    };
    setClients([newClient, ...clients]);
    setShowAddForm(false);
    toast.success('Client added successfully');
  };

  const toggleDoc = (clientId: string, doc: string) => {
    setClients(clients.map((c) => {
      if (c.id !== clientId) return c;
      return { ...c, kyc_documents: { ...c.kyc_documents, [doc]: !c.kyc_documents[doc] } };
    }));
    if (selectedClient?.id === clientId) {
      setSelectedClient((prev) => prev ? { ...prev, kyc_documents: { ...prev.kyc_documents, [doc]: !prev.kyc_documents[doc] } } : null);
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard title="Total Clients" value={formatNumber(clients.length)} icon={<Building2 className="h-5 w-5" />} trend={{ value: 12, positive: true }} />
        <StatCard title="Active Clients" value={formatNumber(activeClients)} icon={<CheckCircle2 className="h-5 w-5" />} trend={{ value: 8, positive: true }} />
        <StatCard title="Pending KYC" value={formatNumber(pendingKyc)} icon={<Clock className="h-5 w-5" />} />
        <StatCard title="Transaction Volume" value={formatCurrency(totalVolume)} icon={<DollarSign className="h-5 w-5" />} trend={{ value: 15, positive: true }} />
      </div>

      {/* Pipeline buttons */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setStageFilter('All')} className={`pipeline-btn ${stageFilter === 'All' ? 'pipeline-btn-active' : 'bg-card text-muted-foreground border-border hover:bg-accent'}`}>
          All ({clients.length})
        </button>
        {CLIENT_STAGES.map((s) => (
          <button key={s} onClick={() => setStageFilter(s)} className={`pipeline-btn ${stageFilter === s ? 'pipeline-btn-active' : 'bg-card text-muted-foreground border-border hover:bg-accent'}`}>
            {s} ({stageCounts[s]})
          </button>
        ))}
      </div>

      {/* Search + Add */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by company or contact..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button onClick={() => setShowAddForm(true)} className="shrink-0">
          <Plus className="mr-1 h-4 w-4" /> Add Client
        </Button>
      </div>

      {/* Client List */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((client) => (
          <div key={client.id} onClick={() => setSelectedClient(client)} className="stat-card cursor-pointer space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold">{client.company_name}</h3>
                <p className="text-sm text-muted-foreground">{client.contact_person}</p>
              </div>
              <span className={`dept-badge ${client.stage === 'Active' ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'}`}>
                {client.stage}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{client.country}</span>
              <span className="font-medium text-foreground">{formatCurrency(client.transaction_volume)}</span>
            </div>
            <div className="flex gap-1">
              {KYC_DOCUMENTS.map((doc, i) => (
                <div key={i} className={`h-1.5 flex-1 rounded-full ${client.kyc_documents[doc] ? 'bg-success' : 'bg-border'}`} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Detail Modal */}
      <Dialog open={!!selectedClient} onOpenChange={() => setSelectedClient(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {selectedClient && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedClient.company_name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Contact:</span> <span className="font-medium">{selectedClient.contact_person}</span></div>
                  <div><span className="text-muted-foreground">Email:</span> <span className="font-medium">{selectedClient.email}</span></div>
                  <div><span className="text-muted-foreground">Phone:</span> <span className="font-medium">{selectedClient.phone}</span></div>
                  <div><span className="text-muted-foreground">Country:</span> <span className="font-medium">{selectedClient.country}</span></div>
                  <div><span className="text-muted-foreground">Industry:</span> <span className="font-medium">{selectedClient.industry}</span></div>
                  <div><span className="text-muted-foreground">Specialist:</span> <span className="font-medium">{selectedClient.assigned_specialist}</span></div>
                  <div><span className="text-muted-foreground">Stage:</span> <span className="font-medium">{selectedClient.stage}</span></div>
                  <div><span className="text-muted-foreground">Volume:</span> <span className="font-medium">{formatCurrency(selectedClient.transaction_volume)}</span></div>
                </div>
                <div>
                  <h4 className="mb-2 font-semibold text-sm">KYC Document Checklist</h4>
                  <div className="space-y-2">
                    {KYC_DOCUMENTS.map((doc) => (
                      <button key={doc} onClick={() => toggleDoc(selectedClient.id, doc)} className="flex w-full items-center gap-2 rounded-lg border p-2.5 text-sm transition-colors hover:bg-accent">
                        <div className={`flex h-5 w-5 items-center justify-center rounded border ${selectedClient.kyc_documents[doc] ? 'bg-success border-success text-success-foreground' : 'border-border'}`}>
                          {selectedClient.kyc_documents[doc] && <Check className="h-3 w-3" />}
                        </div>
                        {doc}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Select value={selectedClient.stage} onValueChange={(v) => {
                    const updated = clients.map((c) => c.id === selectedClient.id ? { ...c, stage: v as ClientStage } : c);
                    setClients(updated);
                    setSelectedClient({ ...selectedClient, stage: v as ClientStage });
                    toast.success(`Stage updated to ${v}`);
                  }}>
                    <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CLIENT_STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Form Modal */}
      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add New Client</DialogTitle></DialogHeader>
          <AddClientForm onSubmit={handleAdd} onCancel={() => setShowAddForm(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AddClientForm({ onSubmit, onCancel }: { onSubmit: (d: Partial<Client>) => void; onCancel: () => void }) {
  const [form, setForm] = useState({ company_name: '', contact_person: '', email: '', phone: '', country: '', industry: '', assigned_specialist: '' });
  const update = (k: string, v: string) => setForm({ ...form, [k]: v });

  return (
    <div className="space-y-3">
      {[
        { key: 'company_name', label: 'Company Name' },
        { key: 'contact_person', label: 'Contact Person' },
        { key: 'email', label: 'Email' },
        { key: 'phone', label: 'Phone' },
        { key: 'country', label: 'Country' },
        { key: 'industry', label: 'Industry' },
        { key: 'assigned_specialist', label: 'Assigned Specialist' },
      ].map(({ key, label }) => (
        <div key={key}>
          <Label className="text-sm">{label}</Label>
          <Input value={(form as any)[key]} onChange={(e) => update(key, e.target.value)} className="mt-1" />
        </div>
      ))}
      <div className="flex gap-2 pt-2">
        <Button variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>
        <Button onClick={() => onSubmit(form)} className="flex-1" disabled={!form.company_name}>Add Client</Button>
      </div>
    </div>
  );
}
