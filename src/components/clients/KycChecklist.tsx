import { useEffect, useState } from 'react';
import { Check, X, Clock, FileText, Plus, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { KYC_DOCUMENTS } from '@/lib/types';

type Item = {
  id: string;
  client_id: string;
  doc_type: string;
  status: 'pending' | 'submitted' | 'approved' | 'rejected';
  file_url: string | null;
  reviewer_name: string;
  reviewed_at: string | null;
  notes: string;
};

const statusStyles: Record<Item['status'], string> = {
  pending: 'bg-muted text-muted-foreground',
  submitted: 'bg-info/10 text-info',
  approved: 'bg-success/10 text-success',
  rejected: 'bg-destructive/10 text-destructive',
};

export function KycChecklist({ clientId, canEdit }: { clientId: string; canEdit: boolean }) {
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newDoc, setNewDoc] = useState('');
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('kyc_checklist_items')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: true });
    setItems((data ?? []) as Item[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [clientId]);

  const addItem = async (docType: string) => {
    if (!docType.trim()) return;
    const { error } = await supabase.from('kyc_checklist_items').insert({
      client_id: clientId,
      doc_type: docType.trim(),
      status: 'pending',
    });
    if (error) return toast.error(error.message);
    setNewDoc('');
    setAdding(false);
    load();
  };

  const seedDefaults = async () => {
    const existing = new Set(items.map((i) => i.doc_type));
    const rows = KYC_DOCUMENTS.filter((d) => !existing.has(d)).map((d) => ({
      client_id: clientId, doc_type: d, status: 'pending' as const,
    }));
    if (rows.length === 0) return;
    const { error } = await supabase.from('kyc_checklist_items').insert(rows);
    if (error) return toast.error(error.message);
    load();
  };

  const updateStatus = async (item: Item, status: Item['status']) => {
    const profile = await supabase.from('profiles').select('full_name').eq('user_id', user!.id).single();
    const patch: any = {
      status,
      reviewer_id: user!.id,
      reviewer_name: profile.data?.full_name || user!.email || 'Reviewer',
      reviewed_at: new Date().toISOString(),
    };
    if (noteDrafts[item.id]) patch.notes = noteDrafts[item.id];
    const { error } = await supabase.from('kyc_checklist_items').update(patch).eq('id', item.id);
    if (error) return toast.error(error.message);
    toast.success(`Marked ${status}`);
    load();
  };

  const uploadFile = async (item: Item, file: File) => {
    const path = `${clientId}/${item.id}-${file.name}`;
    const { error: upErr } = await supabase.storage.from('ticket-attachments').upload(path, file, { upsert: true });
    if (upErr) return toast.error(upErr.message);
    const { data } = supabase.storage.from('ticket-attachments').createSignedUrl
      ? await supabase.storage.from('ticket-attachments').createSignedUrl(path, 60 * 60 * 24 * 30)
      : { data: null as any };
    const url = (data as any)?.signedUrl || path;
    const { error } = await supabase.from('kyc_checklist_items').update({
      file_url: url, status: 'submitted',
    }).eq('id', item.id);
    if (error) return toast.error(error.message);
    toast.success('Document uploaded');
    load();
  };

  if (loading) return <div className="text-xs text-muted-foreground">Loading checklist…</div>;

  return (
    <div className="space-y-2">
      {items.length === 0 && (
        <div className="rounded-lg border bg-muted/30 p-3 text-center">
          <p className="text-xs text-muted-foreground mb-2">No checklist items yet.</p>
          {canEdit && <Button size="sm" variant="outline" onClick={seedDefaults}>Use default KYC checklist</Button>}
        </div>
      )}
      {items.map((item) => (
        <div key={item.id} className="rounded-lg border bg-card p-2.5 text-sm space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="font-medium truncate">{item.doc_type}</span>
            </div>
            <span className={`dept-badge ${statusStyles[item.status]}`}>{item.status}</span>
          </div>
          {item.reviewer_name && item.reviewed_at && (
            <div className="text-xs text-muted-foreground">
              Reviewed by {item.reviewer_name} · {new Date(item.reviewed_at).toLocaleString()}
            </div>
          )}
          {item.notes && <p className="text-xs italic text-muted-foreground">"{item.notes}"</p>}
          {item.file_url && (
            <a href={item.file_url} target="_blank" rel="noreferrer" className="text-xs text-primary underline">
              View document
            </a>
          )}
          {canEdit && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <label className="flex-1 cursor-pointer">
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && uploadFile(item, e.target.files[0])}
                  />
                  <span className="flex items-center justify-center gap-1 rounded-md border border-dashed py-1 text-xs text-muted-foreground hover:bg-accent">
                    <Upload className="h-3 w-3" /> Upload
                  </span>
                </label>
              </div>
              <Textarea
                value={noteDrafts[item.id] ?? item.notes ?? ''}
                onChange={(e) => setNoteDrafts({ ...noteDrafts, [item.id]: e.target.value })}
                placeholder="Reviewer note (optional)"
                rows={2}
                className="text-xs"
              />
              <div className="flex gap-1">
                <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={() => updateStatus(item, 'approved')}>
                  <Check className="h-3 w-3 mr-1" /> Approve
                </Button>
                <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={() => updateStatus(item, 'rejected')}>
                  <X className="h-3 w-3 mr-1" /> Reject
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => updateStatus(item, 'pending')}>
                  <Clock className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}
        </div>
      ))}
      {canEdit && (
        <div>
          {adding ? (
            <div className="flex gap-2">
              <Input value={newDoc} onChange={(e) => setNewDoc(e.target.value)} placeholder="Document name" className="h-8 text-sm" />
              <Button size="sm" onClick={() => addItem(newDoc)}>Add</Button>
              <Button size="sm" variant="ghost" onClick={() => { setAdding(false); setNewDoc(''); }}>Cancel</Button>
            </div>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => setAdding(true)} className="w-full">
              <Plus className="h-3 w-3 mr-1" /> Add document
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// Stage SLA helper
const STAGE_SLA_DAYS: Record<string, number> = {
  'Lead': 7,
  'KYC Submitted': 2,
  'KYC Review': 2,
  'Verified': 7,
};

export function StageSlaBadge({ stage, stageEnteredAt }: { stage: string; stageEnteredAt: string | null }) {
  if (!stageEnteredAt) return null;
  const sla = STAGE_SLA_DAYS[stage];
  if (!sla) return null;
  const enteredMs = new Date(stageEnteredAt).getTime();
  const days = Math.floor((Date.now() - enteredMs) / 86400_000);
  const overdue = days > sla;
  return (
    <span className={`dept-badge ${overdue ? 'bg-destructive/10 text-destructive' : days >= sla ? 'bg-warning/10 text-warning' : 'bg-muted text-muted-foreground'}`}>
      <Clock className="h-3 w-3 inline mr-1" />
      {days}d in stage · SLA {sla}d{overdue ? ' · BREACHED' : ''}
    </span>
  );
}
