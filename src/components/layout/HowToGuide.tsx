import { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

export type GuideModule =
  | 'clients'
  | 'tickets'
  | 'sales'
  | 'kpis'
  | 'hr'
  | 'projects'
  | 'admin';

type Section = { title: string; steps: string[] };

const GUIDES: Record<GuideModule, { title: string; intro: string; sections: Section[] }> = {
  clients: {
    title: 'Customers — How to',
    intro:
      'Manage individuals and businesses through onboarding, KYC, and engagement.',
    sections: [
      {
        title: 'Add a new customer',
        steps: [
          'Click "Add Customer".',
          'Pick Individual or Business — fields adapt automatically.',
          'Fill in contact details and save. The customer lands in the Leads stage.',
        ],
      },
      {
        title: 'Assign and track ownership',
        steps: [
          'Open a customer and pick an assignee (Onboarding, Compliance, etc.).',
          'The SLA badge shows how long the customer has been stuck in the current stage.',
          'Leave a comment so the rest of the team sees the latest context.',
        ],
      },
      {
        title: 'KYC checklist',
        steps: [
          'Open the customer and scroll to the KYC checklist.',
          'Upload each document and mark it Submitted, Approved, or Rejected.',
          'Add reviewer notes — they are visible to managers and admins.',
        ],
      },
      {
        title: 'Move through stages',
        steps: [
          'Update the stage as the customer progresses (Lead → KYC → Active).',
          'Use the Attention Queue on the dashboard for items that need action.',
        ],
      },
    ],
  },
  tickets: {
    title: 'Tickets — How to',
    intro: 'Handle support requests submitted by customers or staff.',
    sections: [
      {
        title: 'Triage a new ticket',
        steps: [
          'Open the ticket and review the description and attachments.',
          'Assign it to yourself or a teammate and set a priority.',
          'Update the status as you progress: Open → In Progress → Resolved.',
        ],
      },
      {
        title: 'Communicate',
        steps: [
          'Use the comment thread to keep all updates in one place.',
          'Mark the ticket Resolved only after the requester confirms.',
        ],
      },
    ],
  },
  sales: {
    title: 'Sales — How to',
    intro: 'Track deals through the pipeline and capture won/lost reasons.',
    sections: [
      {
        title: 'Create a deal',
        steps: [
          'Click "Add Deal", link it to a customer, set value and expected close date.',
          'Drag the deal across pipeline stages as it progresses.',
        ],
      },
      {
        title: 'Close a deal',
        steps: [
          'Move the deal to Won or Lost.',
          'When prompted, enter the reason — this feeds reporting and learnings.',
          'Commission is calculated automatically from won deals.',
        ],
      },
    ],
  },
  kpis: {
    title: 'KPIs — How to',
    intro: 'Monitor department health at a glance.',
    sections: [
      {
        title: 'Read the dashboard',
        steps: [
          'Each card shows a target vs. actual for the current period.',
          'Green = on track, amber = at risk, red = off target.',
        ],
      },
      {
        title: 'Drill in',
        steps: [
          'Click a department to see its underlying records.',
          'Managers can edit targets for their own department.',
        ],
      },
    ],
  },
  hr: {
    title: 'HR — How to',
    intro: 'Manage the team directory, leave, and employee onboarding.',
    sections: [
      {
        title: 'Employee directory',
        steps: [
          'Search and filter team members by department or role.',
          'Open a profile to view role, department, and contact details.',
        ],
      },
      {
        title: 'Leave requests',
        steps: [
          'Switch to the Leave tab to submit a request with dates and reason.',
          'Managers and admins approve or reject from the same view.',
        ],
      },
      {
        title: 'Employee onboarding',
        steps: [
          'Use the Onboarding tab to track tasks for new hires.',
          'Tick items as they are completed — progress is visible to HR.',
        ],
      },
    ],
  },
  projects: {
    title: 'Projects — How to',
    intro: 'Plan and track project work across the team.',
    sections: [
      {
        title: 'Create a project',
        steps: [
          'Click "New Project", set a name, owner, and target date.',
          'Add tasks with assignees and due dates.',
        ],
      },
      {
        title: 'Track progress',
        steps: [
          'Update task status: Todo → In Progress → Done.',
          'Overdue tasks are highlighted automatically.',
        ],
      },
    ],
  },
  admin: {
    title: 'Admin — How to',
    intro: 'Manage team members, roles, and access.',
    sections: [
      {
        title: 'Invite a teammate',
        steps: [
          'Click "Add Team Member" and enter their @tryclea.com email.',
          'Assign a role (admin, manager, staff) and a department.',
          'They receive a first-login link to set their password.',
        ],
      },
      {
        title: 'Change role or department',
        steps: [
          'Open the team member row and update role or department.',
          'Changes are recorded in the audit log.',
        ],
      },
      {
        title: 'Deactivate access',
        steps: [
          'Toggle the active switch to revoke access immediately.',
          'Reactivate later if needed — history is preserved.',
        ],
      },
    ],
  },
};

interface Props {
  module: GuideModule;
}

export function HowToGuide({ module }: Props) {
  const [open, setOpen] = useState(false);
  const guide = GUIDES[module];

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-1.5"
      >
        <HelpCircle className="h-4 w-4" />
        How to
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{guide.title}</DialogTitle>
            <DialogDescription>{guide.intro}</DialogDescription>
          </DialogHeader>
          <div className="space-y-5 pt-2">
            {guide.sections.map((section) => (
              <div key={section.title}>
                <h3 className="mb-2 text-sm font-semibold">{section.title}</h3>
                <ol className="ml-5 list-decimal space-y-1 text-sm text-muted-foreground">
                  {section.steps.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
