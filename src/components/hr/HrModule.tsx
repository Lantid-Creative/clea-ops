import { useEffect, useState } from 'react';
import { Search, Plus, Users, Briefcase, Clock, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatCard } from '@/components/layout/StatCard';
import { HowToGuide } from '@/components/layout/HowToGuide';
import { Employee, Department, EmploymentType, DEPARTMENTS, DEPT_COLORS } from '@/lib/types';
import { formatNumber } from '@/lib/helpers';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { LeaveRequests, OnboardingChecklists } from './HrExtras';

export function HrModule({ canEdit = true }: { canEdit?: boolean }) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState<Department | 'All'>('All');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [view, setView] = useState<'employees' | 'leave' | 'onboarding'>('employees');

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('employees' as any).select('*').eq('archived', false).order('created_at', { ascending: false });
    if (error) toast.error(error.message);
    setEmployees(((data ?? []) as any[]).map((e) => ({
      id: e.id,
      name: e.name,
      role: e.role,
      department: e.department,
      employment_type: e.employment_type,
      email: e.email,
      phone: e.phone,
      start_date: e.start_date || '',
      education: e.education,
      state_of_origin: e.state_of_origin,
      bank_name: e.bank_name,
      account_number: e.account_number,
      emergency_contact_name: e.emergency_contact_name,
      emergency_contact_relationship: e.emergency_contact_relationship,
      emergency_contact_phone: e.emergency_contact_phone,
      created_at: e.created_at,
    })));
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const filtered = employees.filter((e) => {
    const matchSearch = !search || e.name.toLowerCase().includes(search.toLowerCase()) || e.role.toLowerCase().includes(search.toLowerCase());
    const matchDept = deptFilter === 'All' || e.department === deptFilter;
    return matchSearch && matchDept;
  });

  const fullTime = employees.filter((e) => e.employment_type === 'Full-time').length;
  const partTime = employees.filter((e) => e.employment_type === 'Part-time').length;
  const contract = employees.filter((e) => e.employment_type === 'Contract').length;
  const deptCounts = DEPARTMENTS.reduce((acc, d) => {
    acc[d] = employees.filter((e) => e.department === d).length;
    return acc;
  }, {} as Record<Department, number>);

  const handleAdd = async (data: Partial<Employee>) => {
    const { data: { user } } = await supabase.auth.getUser();
    const payload = {
      name: data.name || '',
      role: data.role || '',
      department: (data.department as Department) || 'Operations',
      employment_type: (data.employment_type as EmploymentType) || 'Full-time',
      email: data.email || '',
      phone: data.phone || '',
      start_date: data.start_date || null,
      education: data.education || '',
      state_of_origin: data.state_of_origin || '',
      bank_name: data.bank_name || '',
      account_number: data.account_number || '',
      emergency_contact_name: data.emergency_contact_name || '',
      emergency_contact_relationship: data.emergency_contact_relationship || '',
      emergency_contact_phone: data.emergency_contact_phone || '',
      created_by: user?.id ?? null,
    };
    const { error } = await supabase.from('employees' as any).insert(payload);
    if (error) return toast.error(error.message);
    setShowAddForm(false);
    toast.success('Employee added successfully');
    void load();
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-end">
        <HowToGuide module="hr" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard title="Total Employees" value={formatNumber(employees.length)} icon={<Users className="h-5 w-5" />} />
        <StatCard title="Full-time" value={formatNumber(fullTime)} icon={<Briefcase className="h-5 w-5" />} />
        <StatCard title="Part-time" value={formatNumber(partTime)} icon={<Clock className="h-5 w-5" />} />
        <StatCard title="Contract" value={formatNumber(contract)} icon={<FileText className="h-5 w-5" />} />
      </div>

      <div className="flex rounded-lg border bg-card p-1 w-fit">
        {(['employees','leave','onboarding'] as const).map((v) => (
          <button key={v} onClick={() => setView(v)} className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${view === v ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
            {v === 'employees' ? 'Employees' : v === 'leave' ? 'Leave Requests' : 'Onboarding'}
          </button>
        ))}
      </div>

      {view === 'leave' && <LeaveRequests />}
      {view === 'onboarding' && <OnboardingChecklists />}
      {view === 'employees' && <>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => setDeptFilter('All')} className={`pipeline-btn ${deptFilter === 'All' ? 'pipeline-btn-active' : 'bg-card text-muted-foreground border-border hover:bg-accent'}`}>
          All ({employees.length})
        </button>
        {DEPARTMENTS.map((d) => (
          <button key={d} onClick={() => setDeptFilter(d)} className={`pipeline-btn ${deptFilter === d ? 'pipeline-btn-active' : 'bg-card text-muted-foreground border-border hover:bg-accent'}`}>
            {d} ({deptCounts[d]})
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by name or role..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        {canEdit && (
          <Button onClick={() => setShowAddForm(true)} className="shrink-0">
            <Plus className="mr-1 h-4 w-4" /> Add Employee
          </Button>
        )}
      </div>

      {loading ? (
        <p className="text-center text-sm text-muted-foreground py-8">Loading employees…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          No employees yet. {canEdit ? 'Click "Add Employee" to add the first one.' : 'Ask HR to add staff records.'}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((emp) => (
            <div key={emp.id} onClick={() => setSelectedEmployee(emp)} className="stat-card cursor-pointer space-y-2">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${DEPT_COLORS[emp.department]}`}>
                  {emp.name.split(' ').map((n) => n[0]).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{emp.name}</h3>
                  <p className="text-sm text-muted-foreground truncate">{emp.role}</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className={`dept-badge ${DEPT_COLORS[emp.department]}`}>{emp.department}</span>
                <span className="text-xs text-muted-foreground">{emp.employment_type}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      </>}

      <Dialog open={!!selectedEmployee} onOpenChange={() => setSelectedEmployee(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {selectedEmployee && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedEmployee.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-full text-lg font-semibold ${DEPT_COLORS[selectedEmployee.department]}`}>
                    {selectedEmployee.name.split(' ').map((n) => n[0]).join('')}
                  </div>
                  <div>
                    <p className="font-semibold">{selectedEmployee.role}</p>
                    <span className={`dept-badge ${DEPT_COLORS[selectedEmployee.department]}`}>{selectedEmployee.department}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Email:</span><br /><span className="font-medium">{selectedEmployee.email || '—'}</span></div>
                  <div><span className="text-muted-foreground">Phone:</span><br /><span className="font-medium">{selectedEmployee.phone || '—'}</span></div>
                  <div><span className="text-muted-foreground">Start Date:</span><br /><span className="font-medium">{selectedEmployee.start_date || '—'}</span></div>
                  <div><span className="text-muted-foreground">Type:</span><br /><span className="font-medium">{selectedEmployee.employment_type}</span></div>
                  <div><span className="text-muted-foreground">Education:</span><br /><span className="font-medium">{selectedEmployee.education || '—'}</span></div>
                  <div><span className="text-muted-foreground">State:</span><br /><span className="font-medium">{selectedEmployee.state_of_origin || '—'}</span></div>
                  <div><span className="text-muted-foreground">Bank:</span><br /><span className="font-medium">{selectedEmployee.bank_name || '—'}</span></div>
                  <div><span className="text-muted-foreground">Account:</span><br /><span className="font-medium">{selectedEmployee.account_number || '—'}</span></div>
                </div>
                <div className="rounded-lg border p-3">
                  <h4 className="mb-2 font-semibold text-sm">Emergency Contact</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-muted-foreground">Name:</span> <span className="font-medium">{selectedEmployee.emergency_contact_name || '—'}</span></div>
                    <div><span className="text-muted-foreground">Relation:</span> <span className="font-medium">{selectedEmployee.emergency_contact_relationship || '—'}</span></div>
                    <div className="col-span-2"><span className="text-muted-foreground">Phone:</span> <span className="font-medium">{selectedEmployee.emergency_contact_phone || '—'}</span></div>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add New Employee</DialogTitle></DialogHeader>
          <AddEmployeeForm onSubmit={handleAdd} onCancel={() => setShowAddForm(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AddEmployeeForm({ onSubmit, onCancel }: { onSubmit: (d: Partial<Employee>) => void; onCancel: () => void }) {
  const [form, setForm] = useState<Record<string, string>>({
    name: '', role: '', department: 'Operations', employment_type: 'Full-time', email: '', phone: '', start_date: '', education: '', state_of_origin: '', bank_name: '', account_number: '', emergency_contact_name: '', emergency_contact_relationship: '', emergency_contact_phone: '',
  });
  const update = (k: string, v: string) => setForm({ ...form, [k]: v });

  return (
    <div className="space-y-3">
      {[
        { key: 'name', label: 'Full Name' },
        { key: 'role', label: 'Role' },
        { key: 'email', label: 'Email' },
        { key: 'phone', label: 'Phone' },
        { key: 'start_date', label: 'Start Date', type: 'date' },
        { key: 'education', label: 'Education' },
        { key: 'state_of_origin', label: 'State of Origin' },
        { key: 'bank_name', label: 'Bank Name' },
        { key: 'account_number', label: 'Account Number' },
        { key: 'emergency_contact_name', label: 'Emergency Contact Name' },
        { key: 'emergency_contact_relationship', label: 'Relationship' },
        { key: 'emergency_contact_phone', label: 'Emergency Phone' },
      ].map(({ key, label, type }) => (
        <div key={key}>
          <Label className="text-sm">{label}</Label>
          <Input type={type || 'text'} value={form[key]} onChange={(e) => update(key, e.target.value)} className="mt-1" />
        </div>
      ))}
      <div>
        <Label className="text-sm">Department</Label>
        <Select value={form.department} onValueChange={(v) => update('department', v)}>
          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
          <SelectContent>{DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-sm">Employment Type</Label>
        <Select value={form.employment_type} onValueChange={(v) => update('employment_type', v)}>
          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            {['Full-time', 'Part-time', 'Contract'].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="flex gap-2 pt-2">
        <Button variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>
        <Button onClick={() => onSubmit(form as any)} className="flex-1" disabled={!form.name}>Add Employee</Button>
      </div>
    </div>
  );
}
