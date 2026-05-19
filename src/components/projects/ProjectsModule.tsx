import { useEffect, useState } from 'react';
import { Plus, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ProjectBoardColumn, BOARD_COLUMNS } from '@/lib/types';
import { HowToGuide } from '@/components/layout/HowToGuide';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

type Task = {
  id: string;
  title: string;
  description: string;
  column_name: ProjectBoardColumn;
  assignee: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  labels: string[];
  due_date: string | null;
};

const priorityColors: Record<string, string> = {
  Low: 'bg-muted text-muted-foreground',
  Medium: 'bg-primary/10 text-primary',
  High: 'bg-warning/10 text-warning',
  Urgent: 'bg-destructive/10 text-destructive',
};

const columnColors: Record<ProjectBoardColumn, string> = {
  'Backlog': 'border-t-muted-foreground',
  'To Do': 'border-t-primary',
  'In Progress': 'border-t-warning',
  'In Review': 'border-t-info',
  'Done': 'border-t-success',
};

export function ProjectsModule({ canEdit = true }: { canEdit?: boolean }) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addToColumn, setAddToColumn] = useState<ProjectBoardColumn>('To Do');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('project_tasks')
      .select('*')
      .eq('archived', false)
      .order('created_at', { ascending: true });
    if (error) toast.error(error.message);
    setTasks(((data ?? []) as any[]).map((r) => ({
      id: r.id, title: r.title, description: r.description ?? '',
      column_name: r.column_name as ProjectBoardColumn,
      assignee: r.assignee ?? '', priority: r.priority as any,
      labels: r.labels ?? [], due_date: r.due_date,
    })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async (data: Partial<Task>) => {
    const { error } = await supabase.from('project_tasks').insert({
      title: data.title || '',
      description: data.description || '',
      column_name: addToColumn,
      assignee: data.assignee || '',
      priority: data.priority || 'Medium',
      labels: data.labels || [],
      due_date: data.due_date || null,
      created_by: user?.id,
    });
    if (error) return toast.error(error.message);
    setShowAddForm(false);
    toast.success('Task created');
    load();
  };

  const moveTask = async (taskId: string, newColumn: ProjectBoardColumn) => {
    const { error } = await supabase.from('project_tasks').update({ column_name: newColumn }).eq('id', taskId);
    if (error) return toast.error(error.message);
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, column_name: newColumn } : t));
    toast.success(`Task moved to ${newColumn}`);
  };

  const deleteTask = async (taskId: string) => {
    const { error } = await supabase.from('project_tasks').delete().eq('id', taskId);
    if (error) return toast.error(error.message);
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    setSelectedTask(null);
    toast.success('Task deleted');
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Project Board</h2>
        {canEdit && (
          <Button onClick={() => { setAddToColumn('To Do'); setShowAddForm(true); }} size="sm">
            <Plus className="mr-1 h-4 w-4" /> Add Task
          </Button>
        )}
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading tasks…</div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {BOARD_COLUMNS.map((column) => {
            const columnTasks = tasks.filter((t) => t.column_name === column);
            return (
              <div key={column} className="flex min-w-[280px] flex-1 flex-col">
                <div className={`mb-3 flex items-center justify-between rounded-lg border border-t-4 ${columnColors[column]} bg-card p-2.5`}>
                  <span className="text-sm font-semibold">{column}</span>
                  <div className="flex items-center gap-1">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">{columnTasks.length}</span>
                    {canEdit && (
                      <button onClick={() => { setAddToColumn(column); setShowAddForm(true); }} className="rounded p-0.5 text-muted-foreground hover:text-foreground">
                        <Plus className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  {columnTasks.map((task) => (
                    <div key={task.id} onClick={() => setSelectedTask(task)} className="stat-card cursor-pointer space-y-2 text-sm">
                      <h4 className="font-medium leading-tight">{task.title}</h4>
                      <div className="flex flex-wrap gap-1">
                        <span className={`dept-badge ${priorityColors[task.priority]}`}>{task.priority}</span>
                        {task.labels.map((label) => (
                          <span key={label} className="dept-badge bg-accent text-accent-foreground">{label}</span>
                        ))}
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{task.assignee.split(' ')[0]}</span>
                        {task.due_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {task.due_date}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {selectedTask && (
            <>
              <DialogHeader><DialogTitle>{selectedTask.title}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">{selectedTask.description}</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Assignee:</span><br /><span className="font-medium">{selectedTask.assignee || '—'}</span></div>
                  <div><span className="text-muted-foreground">Priority:</span><br /><span className={`dept-badge ${priorityColors[selectedTask.priority]}`}>{selectedTask.priority}</span></div>
                  <div><span className="text-muted-foreground">Due Date:</span><br /><span className="font-medium">{selectedTask.due_date || 'Not set'}</span></div>
                  <div><span className="text-muted-foreground">Status:</span><br /><span className="font-medium">{selectedTask.column_name}</span></div>
                </div>
                {canEdit && (
                  <>
                    <div>
                      <Label className="text-sm mb-1 block">Move to</Label>
                      <Select value={selectedTask.column_name} onValueChange={(v) => {
                        moveTask(selectedTask.id, v as ProjectBoardColumn);
                        setSelectedTask({ ...selectedTask, column_name: v as ProjectBoardColumn });
                      }}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {BOARD_COLUMNS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button variant="destructive" size="sm" onClick={() => deleteTask(selectedTask.id)}>Delete task</Button>
                  </>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add Task to {addToColumn}</DialogTitle></DialogHeader>
          <AddTaskForm onSubmit={handleAdd} onCancel={() => setShowAddForm(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AddTaskForm({ onSubmit, onCancel }: { onSubmit: (d: Partial<Task>) => void; onCancel: () => void }) {
  const [form, setForm] = useState({ title: '', description: '', assignee: '', priority: 'Medium', due_date: '', labels: '' });
  const update = (k: string, v: string) => setForm({ ...form, [k]: v });
  return (
    <div className="space-y-3">
      <div><Label className="text-sm">Title</Label><Input value={form.title} onChange={(e) => update('title', e.target.value)} className="mt-1" /></div>
      <div><Label className="text-sm">Description</Label><Textarea value={form.description} onChange={(e) => update('description', e.target.value)} className="mt-1" rows={3} /></div>
      <div><Label className="text-sm">Assignee</Label><Input value={form.assignee} onChange={(e) => update('assignee', e.target.value)} className="mt-1" /></div>
      <div>
        <Label className="text-sm">Priority</Label>
        <Select value={form.priority} onValueChange={(v) => update('priority', v)}>
          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
          <SelectContent>{['Low','Medium','High','Urgent'].map((p)=><SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div><Label className="text-sm">Due Date</Label><Input type="date" value={form.due_date} onChange={(e) => update('due_date', e.target.value)} className="mt-1" /></div>
      <div><Label className="text-sm">Labels (comma-separated)</Label><Input value={form.labels} onChange={(e) => update('labels', e.target.value)} className="mt-1" placeholder="Engineering, Bug" /></div>
      <div className="flex gap-2 pt-2">
        <Button variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>
        <Button onClick={() => onSubmit({ ...form, labels: form.labels.split(',').map((l)=>l.trim()).filter(Boolean) } as any)} className="flex-1" disabled={!form.title}>Create Task</Button>
      </div>
    </div>
  );
}
