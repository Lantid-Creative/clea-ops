import { useEffect, useRef, useState } from 'react';
import { Search, Plus, Building2, CheckCircle2, Clock, DollarSign, Check, Archive, ArchiveRestore, Pencil, Upload, AlertCircle, MessageSquare, Trash2, User as UserIcon } from 'lucide-react';
import { KycChecklist, StageSlaBadge } from './KycChecklist';
import { HowToGuide } from '@/components/layout/HowToGuide';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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

// Map legacy "user" labels coming from the spreadsheet to the new "Individual" terminology.
function normalizeCustomerType(v: string): string {
  const s = String(v ?? '').trim().toLowerCase();
  if (!s) return '';
  if (s === 'user' || s === 'individual') return 'Individual';
  if (s === 'business' || s === 'company') return 'Business';
  // Title-case fallback
  return s.charAt(0).toUpperCase() + s.slice(1);
}

type ClientFormData = {
  user_type: string; // 'Business' | 'Individual'
  company_name: string;
  first_name: string;
  last_name: string;
  contact_person: string;
  email: string;
  phone: string;
  country: string;
  industry: string;
  assigned_specialist: string;
};

const emptyForm: ClientFormData = {
  user_type: 'Business',
  company_name: '', first_name: '', last_name: '', contact_person: '', email: '', phone: '', country: '', industry: '', assigned_specialist: '',
};

type TeamMember = { user_id: string; full_name: string };

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
    stage_entered_at: r.stage_entered_at,
    won_lost_reason: r.won_lost_reason ?? '',
    closed_at: r.closed_at ?? null,
    user_type: r.user_type ?? '',
    first_name: r.first_name ?? '',
    last_name: r.last_name ?? '',
    registration_date: r.registration_date ?? null,
    onboarding_status: r.onboarding_status ?? '',
    engagement_status: r.engagement_status ?? '',
    last_contact_date: r.last_contact_date ?? null,
    follow_up_required: !!r.follow_up_required,
    assigned_agent: r.assigned_agent ?? '',
    notes: r.notes ?? '',
  };
}

type CommentRow = {
  id: string;
  client_id: string;
  author_id: string | null;
  author_name: string;
  body: string;
  created_at: string;
};

export function ClientsModule({ canEdit = true, initialFilter }: { canEdit?: boolean; initialFilter?: { stage?: string } }) {
  const [clients, setClients] = useState<Client[]>([]);
  const [archivedSet, setArchivedSet] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<ClientStage | 'All'>(
    (initialFilter?.stage as ClientStage) ?? 'All'
  );
  const [showArchived, setShowArchived] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [onboardingFilter, setOnboardingFilter] = useState<string>('All');
  const [engagementFilter, setEngagementFilter] = useState<string>('All');
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string } | null>(null);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [commentDraft, setCommentDraft] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ created: number; updated: number; skipped: number; errors: string[] } | null>(null);

  useEffect(() => {
    if (initialFilter?.stage) setStageFilter(initialFilter.stage as ClientStage);
  }, [initialFilter?.stage]);

  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array', cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw: any[] = XLSX.utils.sheet_to_json(ws, { defval: '', raw: true });

      const rows: ImportRow[] = [];
      const errors: string[] = [];
      raw.forEach((r, idx) => {
        const mapped: any = {};
        Object.keys(r).forEach((k) => {
          const key = HEADER_MAP[String(k).trim().toLowerCase()];
          if (key) mapped[key] = r[k];
        });
        const email = String(mapped.email ?? '').trim().toLowerCase();
        if (!email) { errors.push(`Row ${idx + 2}: missing email`); return; }
        rows.push({
          user_type: normalizeCustomerType(mapped.user_type),
          first_name: String(mapped.first_name ?? '').trim(),
          last_name: String(mapped.last_name ?? '').trim(),
          email,
          phone: mapped.phone == null ? '' : String(mapped.phone).trim(),
          registration_date: parseDate(mapped.registration_date),
          onboarding_status: String(mapped.onboarding_status ?? '').trim(),
          engagement_status: String(mapped.engagement_status ?? '').trim(),
          last_contact_date: parseDate(mapped.last_contact_date),
          follow_up_required: parseBool(mapped.follow_up_required),
          assigned_agent: String(mapped.assigned_agent ?? '').trim(),
          notes: String(mapped.notes ?? '').trim(),
        });
      });

      const uniq = new Map<string, ImportRow>();
      rows.forEach((r) => uniq.set(r.email, r));
      const skipped = rows.length - uniq.size;

      const allEmails = Array.from(uniq.keys());
      const existingIds = new Set<string>();
      const CHUNK = 200;
      for (let i = 0; i < allEmails.length; i += CHUNK) {
        const slice = allEmails.slice(i, i + CHUNK);
        const { data, error } = await supabase
          .from('clients').select('email').in('email', slice);
        if (error) throw error;
        (data ?? []).forEach((c: any) => existingIds.add(String(c.email).toLowerCase()));
      }

      const { data: { user } } = await supabase.auth.getUser();
      const kyc = Object.fromEntries(KYC_DOCUMENTS.map((d) => [d, false]));

      const payloads = Array.from(uniq.values()).map((r) => {
        const fullName = `${r.first_name} ${r.last_name}`.trim();
        const isActive = r.engagement_status.toLowerCase() === 'active';
        const isOnboarded = r.onboarding_status.toLowerCase() === 'completed';
        const stage: ClientStage = isActive ? 'Active' : (isOnboarded ? 'Onboarded' : 'Lead');
        return {
          email: r.email,
          contact_person: fullName,
          company_name: fullName || r.email,
          phone: r.phone,
          user_type: r.user_type,
          first_name: r.first_name,
          last_name: r.last_name,
          registration_date: r.registration_date,
          onboarding_status: r.onboarding_status,
          engagement_status: r.engagement_status,
          last_contact_date: r.last_contact_date,
          follow_up_required: r.follow_up_required,
          assigned_agent: r.assigned_agent,
          notes: r.notes,
          stage,
          kyc_documents: kyc,
          transaction_volume: 0,
          created_by: user?.id ?? null,
        };
      });

      let created = 0, updated = 0;
      for (let i = 0; i < payloads.length; i += CHUNK) {
        const batch = payloads.slice(i, i + CHUNK);
        const { error } = await supabase
          .from('clients')
          .upsert(batch, { onConflict: 'email', ignoreDuplicates: false });
        if (error) {
          errors.push(`Batch ${i / CHUNK + 1}: ${error.message}`);
          continue;
        }
        for (const p of batch) {
          if (existingIds.has(p.email)) updated++; else created++;
        }
      }

      setImportResult({ created, updated, skipped, errors });
      if (created + updated > 0) toast.success(`Imported ${created} new, updated ${updated}`);
      else if (errors.length) toast.error(`Import failed: ${errors[0]}`);
      load();
    } catch (err: any) {
      toast.error(err.message ?? 'Import failed');
      setImportResult({ created: 0, updated: 0, skipped: 0, errors: [err.message ?? 'Unknown error'] });
    } finally {
      setImporting(false);
    }
  };

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

  const loadTeam = async () => {
    // Active team members for assignment dropdown
    const { data: roles } = await supabase
      .from('user_roles')
      .select('user_id, is_active')
      .eq('is_active', true);
    const ids = (roles ?? []).map((r: any) => r.user_id);
    if (ids.length === 0) { setTeam([]); return; }
    const { data: profs } = await supabase
      .from('profiles')
      .select('user_id, full_name')
      .in('user_id', ids);
    const members = (profs ?? [])
      .map((p: any) => ({ user_id: p.user_id, full_name: (p.full_name || '').trim() || 'Unnamed member' }))
      .sort((a, b) => a.full_name.localeCompare(b.full_name));
    setTeam(members);
  };

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: prof } = await supabase.from('profiles').select('full_name').eq('user_id', user.id).maybeSingle();
    setCurrentUser({ id: user.id, name: (prof?.full_name || user.email || 'Member').trim() });
  };

  useEffect(() => { load(); loadTeam(); loadCurrentUser(); }, []);

  const loadComments = async (clientId: string) => {
    const { data, error } = await supabase
      .from('client_comments')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: true });
    if (error) { toast.error(error.message); return; }
    setComments((data ?? []) as CommentRow[]);
  };

  useEffect(() => {
    if (selectedClient) {
      setCommentDraft('');
      loadComments(selectedClient.id);
    } else {
      setComments([]);
    }
  }, [selectedClient?.id]);

  const postComment = async () => {
    if (!selectedClient || !commentDraft.trim() || !currentUser) return;
    setPostingComment(true);
    const { error } = await supabase.from('client_comments').insert({
      client_id: selectedClient.id,
      author_id: currentUser.id,
      author_name: currentUser.name,
      body: commentDraft.trim(),
    });
    setPostingComment(false);
    if (error) return toast.error(error.message);
    setCommentDraft('');
    loadComments(selectedClient.id);
  };

  const deleteComment = async (id: string) => {
    const { error } = await supabase.from('client_comments').delete().eq('id', id);
    if (error) return toast.error(error.message);
    if (selectedClient) loadComments(selectedClient.id);
  };

  const visible = clients.filter((c) => showArchived ? archivedSet[c.id] : !archivedSet[c.id]);

  const onboardingOptions = Array.from(new Set(visible.map((c) => c.onboarding_status).filter(Boolean))) as string[];
  const engagementOptions = Array.from(new Set(visible.map((c) => c.engagement_status).filter(Boolean))) as string[];

  const filtered = visible.filter((c) => {
    const q = search.toLowerCase();
    const matchSearch = !q || c.company_name.toLowerCase().includes(q) || c.contact_person.toLowerCase().includes(q) || c.email.toLowerCase().includes(q);
    const matchStage = stageFilter === 'All' || c.stage === stageFilter;
    const matchOnboarding = onboardingFilter === 'All' || c.onboarding_status === onboardingFilter;
    const matchEngagement = engagementFilter === 'All' || c.engagement_status === engagementFilter;
    return matchSearch && matchStage && matchOnboarding && matchEngagement;
  });

  const stageCounts = CLIENT_STAGES.reduce((acc, s) => {
    acc[s] = visible.filter((c) => c.stage === s).length;
    return acc;
  }, {} as Record<ClientStage, number>);

  const totalVolume = visible.reduce((s, c) => s + c.transaction_volume, 0);
  const activeClients = visible.filter((c) => c.stage === 'Active').length;
  const pendingKyc = visible.filter((c) => c.stage === 'KYC Submitted' || c.stage === 'KYC Review').length;

  const saveClient = async (form: ClientFormData) => {
    const isIndividual = form.user_type === 'Individual';
    const fullName = `${form.first_name} ${form.last_name}`.trim();
    const payload: any = {
      user_type: form.user_type,
      first_name: form.first_name,
      last_name: form.last_name,
      company_name: isIndividual ? (fullName || form.email) : form.company_name,
      contact_person: isIndividual ? fullName : form.contact_person,
      email: form.email,
      phone: form.phone,
      country: form.country,
      industry: form.industry,
      assigned_specialist: form.assigned_specialist,
    };
    if (editing) {
      const { error } = await supabase.from('clients').update(payload).eq('id', editing.id);
      if (error) return toast.error(error.message);
      toast.success('Customer updated');
    } else {
      const kyc = Object.fromEntries(KYC_DOCUMENTS.map((d) => [d, false]));
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('clients').insert({
        ...payload,
        stage: 'Lead',
        kyc_documents: kyc,
        transaction_volume: 0,
        created_by: user?.id ?? null,
      });
      if (error) return toast.error(error.message);
      toast.success('Customer added');
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

  const updateAssignee = async (client: Client, specialistName: string) => {
    const { error } = await supabase.from('clients').update({ assigned_specialist: specialistName }).eq('id', client.id);
    if (error) return toast.error(error.message);
    setClients((prev) => prev.map((c) => c.id === client.id ? { ...c, assigned_specialist: specialistName } : c));
    setSelectedClient((prev) => prev && prev.id === client.id ? { ...prev, assigned_specialist: specialistName } : prev);
    toast.success(specialistName ? `Assigned to ${specialistName}` : 'Unassigned');
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
    toast.success(newArchived ? 'Customer archived' : 'Customer restored');
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-end">
        <HowToGuide module="clients" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard title="Total Customers" value={formatNumber(visible.length)} icon={<Building2 className="h-5 w-5" />} />
        <StatCard title="Active Customers" value={formatNumber(activeClients)} icon={<CheckCircle2 className="h-5 w-5" />} />
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
          <Input placeholder="Search by name, contact, or email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        {onboardingOptions.length > 0 && (
          <Select value={onboardingFilter} onValueChange={setOnboardingFilter}>
            <SelectTrigger className="w-[170px] shrink-0"><SelectValue placeholder="Onboarding" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All onboarding</SelectItem>
              {onboardingOptions.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        {engagementOptions.length > 0 && (
          <Select value={engagementFilter} onValueChange={setEngagementFilter}>
            <SelectTrigger className="w-[170px] shrink-0"><SelectValue placeholder="Engagement" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All engagement</SelectItem>
              {engagementOptions.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <Button variant={showArchived ? 'default' : 'outline'} onClick={() => setShowArchived((v) => !v)} className="shrink-0">
          <Archive className="mr-1 h-4 w-4" /> {showArchived ? 'Showing archived' : 'Show archived'}
        </Button>
        {canEdit && !showArchived && (
          <>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileSelected} />
            <Button variant="outline" onClick={handleImportClick} disabled={importing} className="shrink-0">
              <Upload className="mr-1 h-4 w-4" /> {importing ? 'Importing...' : 'Bulk import'}
            </Button>
            <Button onClick={() => { setEditing(null); setFormOpen(true); }} className="shrink-0">
              <Plus className="mr-1 h-4 w-4" /> Add Customer
            </Button>
          </>
        )}
      </div>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">Loading customers...</div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          {showArchived ? 'No archived customers.' : 'No customers yet. Add your first one to get started.'}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((client) => {
            const type = normalizeCustomerType(client.user_type);
            return (
              <div key={client.id} onClick={() => setSelectedClient(client)} className="stat-card cursor-pointer space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold truncate">{client.company_name}</h3>
                    <p className="text-xs text-muted-foreground truncate">{client.email || client.contact_person || '—'}</p>
                  </div>
                  {type && (
                    <span className="dept-badge bg-muted text-muted-foreground shrink-0">
                      {type === 'Individual' ? <UserIcon className="mr-1 h-3 w-3 inline" /> : <Building2 className="mr-1 h-3 w-3 inline" />}
                      {type}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {client.onboarding_status && (
                    <span className={`dept-badge ${client.onboarding_status === 'Completed' ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'}`}>
                      {client.onboarding_status}
                    </span>
                  )}
                  {client.engagement_status && (
                    <span className={`dept-badge ${client.engagement_status === 'Active' ? 'bg-success/10 text-success' : client.engagement_status === 'Low' ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning'}`}>
                      {client.engagement_status}
                    </span>
                  )}
                  {client.follow_up_required && (
                    <span className="dept-badge bg-warning/10 text-warning"><AlertCircle className="mr-1 h-3 w-3 inline" />Follow up</span>
                  )}
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="truncate">
                    {client.assigned_specialist ? `Assigned: ${client.assigned_specialist}` : (client.assigned_agent || client.country || 'Unassigned')}
                  </span>
                  <span>{client.registration_date ? new Date(client.registration_date).toLocaleDateString() : ''}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      <Dialog open={!!selectedClient} onOpenChange={() => setSelectedClient(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {selectedClient && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedClient.company_name}</DialogTitle>
                <DialogDescription>
                  {normalizeCustomerType(selectedClient.user_type) || 'Customer'} · {selectedClient.email || '—'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Type:</span> <span className="font-medium">{normalizeCustomerType(selectedClient.user_type) || '—'}</span></div>
                  <div><span className="text-muted-foreground">Contact:</span> <span className="font-medium">{selectedClient.contact_person || '—'}</span></div>
                  <div><span className="text-muted-foreground">Phone:</span> <span className="font-medium">{selectedClient.phone || '—'}</span></div>
                  <div><span className="text-muted-foreground">Country:</span> <span className="font-medium">{selectedClient.country || '—'}</span></div>
                  <div><span className="text-muted-foreground">Industry:</span> <span className="font-medium">{selectedClient.industry || '—'}</span></div>
                  <div><span className="text-muted-foreground">Stage:</span> <span className="font-medium">{selectedClient.stage}</span></div>
                  <div><span className="text-muted-foreground">Volume:</span> <span className="font-medium">{formatCurrency(selectedClient.transaction_volume)}</span></div>
                  <div><span className="text-muted-foreground">Assigned:</span> <span className="font-medium">{selectedClient.assigned_specialist || 'Unassigned'}</span></div>
                </div>

                {canEdit && (
                  <div>
                    <Label className="text-sm mb-1 block">Assign to team member</Label>
                    <Select
                      value={selectedClient.assigned_specialist || '__none__'}
                      onValueChange={(v) => updateAssignee(selectedClient, v === '__none__' ? '' : v)}
                    >
                      <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Unassigned</SelectItem>
                        {team.map((m) => (
                          <SelectItem key={m.user_id} value={m.full_name}>{m.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <h4 className="font-semibold text-sm">KYC Document Checklist</h4>
                    <StageSlaBadge stage={selectedClient.stage} stageEnteredAt={(selectedClient as any).stage_entered_at ?? null} />
                  </div>
                  <KycChecklist clientId={selectedClient.id} canEdit={canEdit} />
                </div>

                {/* Team comments */}
                <div>
                  <h4 className="mb-2 flex items-center gap-2 font-semibold text-sm">
                    <MessageSquare className="h-4 w-4" /> Team comments ({comments.length})
                  </h4>
                  <div className="space-y-2 max-h-56 overflow-y-auto rounded-lg border p-2 bg-muted/30">
                    {comments.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-3">No comments yet. Add the first note below.</p>
                    ) : comments.map((c) => (
                      <div key={c.id} className="rounded-md bg-card border p-2 text-sm">
                        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground mb-1">
                          <span className="font-medium text-foreground">{c.author_name || 'Member'}</span>
                          <span className="flex items-center gap-2">
                            {new Date(c.created_at).toLocaleString()}
                            {currentUser?.id === c.author_id && (
                              <button onClick={() => deleteComment(c.id)} className="hover:text-destructive" title="Delete">
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap text-sm">{c.body}</p>
                      </div>
                    ))}
                  </div>
                  {canEdit && (
                    <div className="mt-2 space-y-2">
                      <Textarea
                        value={commentDraft}
                        onChange={(e) => setCommentDraft(e.target.value)}
                        placeholder="Leave a note for the team..."
                        rows={2}
                      />
                      <Button size="sm" onClick={postComment} disabled={!commentDraft.trim() || postingComment} className="w-full">
                        {postingComment ? 'Posting...' : 'Post comment'}
                      </Button>
                    </div>
                  )}
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
          <DialogHeader><DialogTitle>{editing ? 'Edit Customer' : 'Add New Customer'}</DialogTitle></DialogHeader>
          <ClientForm
            initial={editing ? {
              user_type: normalizeCustomerType(editing.user_type) || 'Business',
              company_name: editing.company_name,
              first_name: editing.first_name || '',
              last_name: editing.last_name || '',
              contact_person: editing.contact_person,
              email: editing.email,
              phone: editing.phone,
              country: editing.country,
              industry: editing.industry,
              assigned_specialist: editing.assigned_specialist,
            } : emptyForm}
            submitLabel={editing ? 'Save Changes' : 'Add Customer'}
            team={team}
            onSubmit={saveClient}
            onCancel={() => { setFormOpen(false); setEditing(null); }}
          />
        </DialogContent>
      </Dialog>

      {/* Import Result Dialog */}
      <Dialog open={!!importResult} onOpenChange={() => setImportResult(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Import complete</DialogTitle>
            <DialogDescription>
              Customers matched by email are updated; new emails are added.
            </DialogDescription>
          </DialogHeader>
          {importResult && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg border p-2"><div className="text-2xl font-semibold text-success">{importResult.created}</div><div className="text-xs text-muted-foreground">Added</div></div>
                <div className="rounded-lg border p-2"><div className="text-2xl font-semibold text-primary">{importResult.updated}</div><div className="text-xs text-muted-foreground">Updated</div></div>
                <div className="rounded-lg border p-2"><div className="text-2xl font-semibold text-muted-foreground">{importResult.skipped}</div><div className="text-xs text-muted-foreground">Duplicates</div></div>
              </div>
              {importResult.errors.length > 0 && (
                <div>
                  <h4 className="font-medium mb-1">Errors ({importResult.errors.length})</h4>
                  <div className="max-h-40 overflow-y-auto rounded border bg-muted p-2 text-xs space-y-1">
                    {importResult.errors.slice(0, 50).map((e, i) => <div key={i}>{e}</div>)}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ClientForm({ initial, submitLabel, team, onSubmit, onCancel }: {
  initial: ClientFormData;
  submitLabel: string;
  team: TeamMember[];
  onSubmit: (d: ClientFormData) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<ClientFormData>(initial);
  const update = <K extends keyof ClientFormData>(k: K, v: ClientFormData[K]) => setForm({ ...form, [k]: v });
  const isIndividual = form.user_type === 'Individual';

  const canSubmit = isIndividual
    ? !!(form.first_name.trim() || form.last_name.trim() || form.email.trim())
    : !!form.company_name.trim();

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-sm mb-1 block">Customer type</Label>
        <div className="grid grid-cols-2 gap-2">
          {(['Business', 'Individual'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => update('user_type', t)}
              className={`flex items-center justify-center gap-2 rounded-md border p-2.5 text-sm transition-colors ${form.user_type === t ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-accent'}`}
            >
              {t === 'Business' ? <Building2 className="h-4 w-4" /> : <UserIcon className="h-4 w-4" />}
              {t}
            </button>
          ))}
        </div>
      </div>

      {isIndividual ? (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-sm">First Name</Label>
            <Input value={form.first_name} onChange={(e) => update('first_name', e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-sm">Last Name</Label>
            <Input value={form.last_name} onChange={(e) => update('last_name', e.target.value)} className="mt-1" />
          </div>
        </div>
      ) : (
        <>
          <div>
            <Label className="text-sm">Company Name</Label>
            <Input value={form.company_name} onChange={(e) => update('company_name', e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-sm">Contact Person</Label>
            <Input value={form.contact_person} onChange={(e) => update('contact_person', e.target.value)} className="mt-1" />
          </div>
        </>
      )}

      {([
        ['email', 'Email'],
        ['phone', 'Phone'],
        ['country', 'Country'],
        ['industry', 'Industry'],
      ] as [keyof ClientFormData, string][]).map(([key, label]) => (
        <div key={key}>
          <Label className="text-sm">{label}</Label>
          <Input value={form[key] as string} onChange={(e) => update(key, e.target.value as any)} className="mt-1" />
        </div>
      ))}

      <div>
        <Label className="text-sm mb-1 block">Assigned specialist</Label>
        <Select
          value={form.assigned_specialist || '__none__'}
          onValueChange={(v) => update('assigned_specialist', v === '__none__' ? '' : v)}
        >
          <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Unassigned</SelectItem>
            {team.map((m) => (
              <SelectItem key={m.user_id} value={m.full_name}>{m.full_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2 pt-2">
        <Button variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>
        <Button onClick={() => onSubmit(form)} className="flex-1" disabled={!canSubmit}>{submitLabel}</Button>
      </div>
    </div>
  );
}
