import { useEffect, useRef, useState } from 'react';
import { Search, Plus, Building2, CheckCircle2, Clock, DollarSign, Check, Archive, ArchiveRestore, Pencil, Upload, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatCard } from '@/components/layout/StatCard';
import { Client, ClientStage, CLIENT_STAGES, KYC_DOCUMENTS } from '@/lib/types';
import { formatCurrency, formatNumber } from '@/lib/helpers';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type ImportRow = {
  user_type: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  registration_date: string | null;
  onboarding_status: string;
  engagement_status: string;
  last_contact_date: string | null;
  follow_up_required: boolean;
  assigned_agent: string;
  notes: string;
};

const HEADER_MAP: Record<string, keyof ImportRow> = {
  'user type': 'user_type',
  'first name': 'first_name',
  'last name': 'last_name',
  'email': 'email',
  'phone number': 'phone',
  'phone': 'phone',
  'registration date': 'registration_date',
  'onboarding status': 'onboarding_status',
  'engagement status': 'engagement_status',
  'last contact date': 'last_contact_date',
  'follow-up required': 'follow_up_required',
  'follow up required': 'follow_up_required',
  'assigned agent': 'assigned_agent',
  'notes': 'notes',
};

function parseDate(v: any): string | null {
  if (v == null || v === '') return null;
  if (v instanceof Date) return v.toISOString();
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function parseBool(v: any): boolean {
  if (typeof v === 'boolean') return v;
  if (v == null) return false;
  const s = String(v).toLowerCase().trim();
  return s === 'true' || s === 'yes' || s === '1' || s === 'y';
}

type ClientFormData = {
  company_name: string;
  contact_person: string;
  email: string;
  phone: string;
  country: string;
  industry: string;
  assigned_specialist: string;
};

const emptyForm: ClientFormData = {
  company_name: '', contact_person: '', email: '', phone: '', country: '', industry: '', assigned_specialist: '',
};

function rowToClient(r: any): Client {
  return {
    id: r.id,
    company_name: r.company_name ?? '',
    contact_person: r.contact_person ?? '',
    email: r.email ?? '',
    phone: r.phone ?? '',
    country: r.country ?? '',
    industry: r.industry ?? '',
    assigned_specialist: r.assigned_specialist ?? '',
    stage: r.stage as ClientStage,
    kyc_documents: (r.kyc_documents ?? {}) as Record<string, boolean>,
    transaction_volume: Number(r.transaction_volume ?? 0),
    onboard_date: r.onboard_date,
    created_at: r.created_at,
  };
}

export function ClientsModule({ canEdit = true }: { canEdit?: boolean }) {
  const [clients, setClients] = useState<Client[]>([]);
  const [archivedSet, setArchivedSet] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<ClientStage | 'All'>('All');
  const [showArchived, setShowArchived] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    const arch: Record<string, boolean> = {};
    (data ?? []).forEach((r: any) => { arch[r.id] = !!r.archived; });
    setArchivedSet(arch);
    setClients((data ?? []).map(rowToClient));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const visible = clients.filter((c) => showArchived ? archivedSet[c.id] : !archivedSet[c.id]);

  const filtered = visible.filter((c) => {
    const q = search.toLowerCase();
    const matchSearch = !q || c.company_name.toLowerCase().includes(q) || c.contact_person.toLowerCase().includes(q);
    const matchStage = stageFilter === 'All' || c.stage === stageFilter;
    return matchSearch && matchStage;
  });

  const stageCounts = CLIENT_STAGES.reduce((acc, s) => {
    acc[s] = visible.filter((c) => c.stage === s).length;
    return acc;
  }, {} as Record<ClientStage, number>);

  const totalVolume = visible.reduce((s, c) => s + c.transaction_volume, 0);
  const activeClients = visible.filter((c) => c.stage === 'Active').length;
  const pendingKyc = visible.filter((c) => c.stage === 'KYC Submitted' || c.stage === 'KYC Review').length;

  const saveClient = async (form: ClientFormData) => {
    if (editing) {
      const { error } = await supabase.from('clients').update(form).eq('id', editing.id);
      if (error) return toast.error(error.message);
      toast.success('Client updated');
    } else {
      const kyc = Object.fromEntries(KYC_DOCUMENTS.map((d) => [d, false]));
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('clients').insert({
        ...form,
        stage: 'Lead',
        kyc_documents: kyc,
        transaction_volume: 0,
        created_by: user?.id ?? null,
      });
      if (error) return toast.error(error.message);
      toast.success('Client added');
    }
    setFormOpen(false);
    setEditing(null);
    load();
  };

  const updateStage = async (client: Client, stage: ClientStage) => {
    const patch: any = { stage };
    if (stage === 'Onboarded' && !client.onboard_date) patch.onboard_date = new Date().toISOString().slice(0, 10);
    const { error } = await supabase.from('clients').update(patch).eq('id', client.id);
    if (error) return toast.error(error.message);
    setClients((prev) => prev.map((c) => c.id === client.id ? { ...c, stage, onboard_date: patch.onboard_date ?? c.onboard_date } : c));
    setSelectedClient((prev) => prev && prev.id === client.id ? { ...prev, stage, onboard_date: patch.onboard_date ?? prev.onboard_date } : prev);
    toast.success(`Stage updated to ${stage}`);
  };

  const toggleDoc = async (client: Client, doc: string) => {
    const next = { ...client.kyc_documents, [doc]: !client.kyc_documents[doc] };
    const { error } = await supabase.from('clients').update({ kyc_documents: next }).eq('id', client.id);
    if (error) return toast.error(error.message);
    setClients((prev) => prev.map((c) => c.id === client.id ? { ...c, kyc_documents: next } : c));
    setSelectedClient((prev) => prev && prev.id === client.id ? { ...prev, kyc_documents: next } : prev);
  };

  const toggleArchive = async (client: Client) => {
    const newArchived = !archivedSet[client.id];
    const { error } = await supabase.from('clients').update({ archived: newArchived }).eq('id', client.id);
    if (error) return toast.error(error.message);
    setArchivedSet((prev) => ({ ...prev, [client.id]: newArchived }));
    setSelectedClient(null);
    toast.success(newArchived ? 'Client archived' : 'Client restored');
  };

  return (
    <div className="p-4 space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard title="Total Clients" value={formatNumber(visible.length)} icon={<Building2 className="h-5 w-5" />} />
        <StatCard title="Active Clients" value={formatNumber(activeClients)} icon={<CheckCircle2 className="h-5 w-5" />} />
        <StatCard title="Pending KYC" value={formatNumber(pendingKyc)} icon={<Clock className="h-5 w-5" />} />
        <StatCard title="Transaction Volume" value={formatCurrency(totalVolume)} icon={<DollarSign className="h-5 w-5" />} />
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => setStageFilter('All')} className={`pipeline-btn ${stageFilter === 'All' ? 'pipeline-btn-active' : 'bg-card text-muted-foreground border-border hover:bg-accent'}`}>
          All ({visible.length})
        </button>
        {CLIENT_STAGES.map((s) => (
          <button key={s} onClick={() => setStageFilter(s)} className={`pipeline-btn ${stageFilter === s ? 'pipeline-btn-active' : 'bg-card text-muted-foreground border-border hover:bg-accent'}`}>
            {s} ({stageCounts[s]})
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by company or contact..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button variant={showArchived ? 'default' : 'outline'} onClick={() => setShowArchived((v) => !v)} className="shrink-0">
          <Archive className="mr-1 h-4 w-4" /> {showArchived ? 'Showing archived' : 'Show archived'}
        </Button>
        {canEdit && !showArchived && (
          <Button onClick={() => { setEditing(null); setFormOpen(true); }} className="shrink-0">
            <Plus className="mr-1 h-4 w-4" /> Add Client
          </Button>
        )}
      </div>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">Loading clients...</div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          {showArchived ? 'No archived clients.' : 'No clients yet. Add your first one to get started.'}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((client) => (
            <div key={client.id} onClick={() => setSelectedClient(client)} className="stat-card cursor-pointer space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{client.company_name}</h3>
                  <p className="text-sm text-muted-foreground">{client.contact_person || '—'}</p>
                </div>
                <span className={`dept-badge ${client.stage === 'Active' ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'}`}>
                  {client.stage}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{client.country || '—'}</span>
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
      )}

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
                  <div><span className="text-muted-foreground">Contact:</span> <span className="font-medium">{selectedClient.contact_person || '—'}</span></div>
                  <div><span className="text-muted-foreground">Email:</span> <span className="font-medium break-all">{selectedClient.email || '—'}</span></div>
                  <div><span className="text-muted-foreground">Phone:</span> <span className="font-medium">{selectedClient.phone || '—'}</span></div>
                  <div><span className="text-muted-foreground">Country:</span> <span className="font-medium">{selectedClient.country || '—'}</span></div>
                  <div><span className="text-muted-foreground">Industry:</span> <span className="font-medium">{selectedClient.industry || '—'}</span></div>
                  <div><span className="text-muted-foreground">Specialist:</span> <span className="font-medium">{selectedClient.assigned_specialist || '—'}</span></div>
                  <div><span className="text-muted-foreground">Stage:</span> <span className="font-medium">{selectedClient.stage}</span></div>
                  <div><span className="text-muted-foreground">Volume:</span> <span className="font-medium">{formatCurrency(selectedClient.transaction_volume)}</span></div>
                </div>
                <div>
                  <h4 className="mb-2 font-semibold text-sm">KYC Document Checklist</h4>
                  <div className="space-y-2">
                    {KYC_DOCUMENTS.map((doc) => (
                      <button
                        key={doc}
                        onClick={() => canEdit && toggleDoc(selectedClient, doc)}
                        disabled={!canEdit}
                        className="flex w-full items-center gap-2 rounded-lg border p-2.5 text-sm transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        <div className={`flex h-5 w-5 items-center justify-center rounded border ${selectedClient.kyc_documents[doc] ? 'bg-success border-success text-success-foreground' : 'border-border'}`}>
                          {selectedClient.kyc_documents[doc] && <Check className="h-3 w-3" />}
                        </div>
                        {doc}
                      </button>
                    ))}
                  </div>
                </div>
                {canEdit && (
                  <>
                    <div>
                      <Label className="text-sm mb-1 block">Stage</Label>
                      <Select value={selectedClient.stage} onValueChange={(v) => updateStage(selectedClient, v as ClientStage)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CLIENT_STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1" onClick={() => { setEditing(selectedClient); setSelectedClient(null); setFormOpen(true); }}>
                        <Pencil className="mr-1 h-4 w-4" /> Edit
                      </Button>
                      <Button variant="outline" className="flex-1" onClick={() => toggleArchive(selectedClient)}>
                        {archivedSet[selectedClient.id] ? <><ArchiveRestore className="mr-1 h-4 w-4" /> Restore</> : <><Archive className="mr-1 h-4 w-4" /> Archive</>}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Add/Edit Form Modal */}
      <Dialog open={formOpen} onOpenChange={(o) => { setFormOpen(o); if (!o) setEditing(null); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Edit Client' : 'Add New Client'}</DialogTitle></DialogHeader>
          <ClientForm
            initial={editing ? {
              company_name: editing.company_name,
              contact_person: editing.contact_person,
              email: editing.email,
              phone: editing.phone,
              country: editing.country,
              industry: editing.industry,
              assigned_specialist: editing.assigned_specialist,
            } : emptyForm}
            submitLabel={editing ? 'Save Changes' : 'Add Client'}
            onSubmit={saveClient}
            onCancel={() => { setFormOpen(false); setEditing(null); }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ClientForm({ initial, submitLabel, onSubmit, onCancel }: {
  initial: ClientFormData;
  submitLabel: string;
  onSubmit: (d: ClientFormData) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<ClientFormData>(initial);
  const update = (k: keyof ClientFormData, v: string) => setForm({ ...form, [k]: v });

  return (
    <div className="space-y-3">
      {([
        ['company_name', 'Company Name'],
        ['contact_person', 'Contact Person'],
        ['email', 'Email'],
        ['phone', 'Phone'],
        ['country', 'Country'],
        ['industry', 'Industry'],
        ['assigned_specialist', 'Assigned Specialist'],
      ] as [keyof ClientFormData, string][]).map(([key, label]) => (
        <div key={key}>
          <Label className="text-sm">{label}</Label>
          <Input value={form[key]} onChange={(e) => update(key, e.target.value)} className="mt-1" />
        </div>
      ))}
      <div className="flex gap-2 pt-2">
        <Button variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>
        <Button onClick={() => onSubmit(form)} className="flex-1" disabled={!form.company_name.trim()}>{submitLabel}</Button>
      </div>
    </div>
  );
}
