import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CheckCircle2 } from 'lucide-react';

const CATEGORIES = ['general', 'kyc', 'payments', 'onboarding', 'technical', 'billing', 'other'];

export default function SubmitTicket() {
  const [submitted, setSubmitted] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    requester_name: '',
    requester_email: '',
    company: '',
    category: 'general',
    title: '',
    description: '',
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim() || !form.requester_email.trim()) {
      toast.error('Please fill in name, email, title and description.');
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.requester_email)) {
      toast.error('Please enter a valid email address.');
      return;
    }
    setBusy(true);
    const { data, error } = await supabase
      .from('tickets')
      .insert({
        title: form.title.trim().slice(0, 200),
        description: `${form.description.trim().slice(0, 4000)}${form.company ? `\n\nCompany: ${form.company.slice(0, 200)}` : ''}`,
        category: form.category,
        priority: 'medium',
        source: 'portal',
        status: 'open',
        requester_name: form.requester_name.trim().slice(0, 120),
        requester_email: form.requester_email.trim().slice(0, 200),
      })
      .select('ticket_number')
      .single();
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setSubmitted(data?.ticket_number ?? 0);
  };

  if (submitted !== null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md rounded-lg border bg-card p-8 text-center shadow-sm">
          <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-success" />
          <h1 className="text-xl font-semibold">Ticket submitted</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Thanks — your reference number is <span className="font-mono font-medium text-foreground">#{submitted}</span>.
            Our team will get back to you by email.
          </p>
          <Button className="mt-6" onClick={() => { setSubmitted(null); setForm({ requester_name: '', requester_email: '', company: '', category: 'general', title: '', description: '' }); }}>
            Submit another
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-xl">
        <div className="mb-6 flex items-center gap-3">
          <img src={new URL('@/assets/clea-logo.png', import.meta.url).href} alt="Clea" className="h-10 w-auto object-contain" />
          <div>
            <h1 className="text-xl font-semibold">Submit a request</h1>
            <p className="text-sm text-muted-foreground">We'll respond within one business day.</p>
          </div>
        </div>
        <form onSubmit={submit} className="space-y-4 rounded-lg border bg-card p-6 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Your name</Label>
              <Input value={form.requester_name} onChange={(e) => setForm({ ...form, requester_name: e.target.value })} maxLength={120} required />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.requester_email} onChange={(e) => setForm({ ...form, requester_email: e.target.value })} maxLength={200} required />
            </div>
          </div>
          <div>
            <Label>Company (optional)</Label>
            <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} maxLength={200} />
          </div>
          <div>
            <Label>Category</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Subject</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={200} required />
          </div>
          <div>
            <Label>Describe the issue</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={4000} rows={6} required />
          </div>
          <div className="flex items-center justify-between">
            <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">Back</Link>
            <Button type="submit" disabled={busy}>{busy ? 'Submitting…' : 'Submit ticket'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
