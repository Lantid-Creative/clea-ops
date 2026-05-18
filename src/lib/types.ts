export type ClientStage = 'Lead' | 'KYC Submitted' | 'KYC Review' | 'Verified' | 'Onboarded' | 'Active';

export interface Client {
  id: string;
  company_name: string;
  contact_person: string;
  email: string;
  phone: string;
  country: string;
  industry: string;
  assigned_specialist: string;
  stage: ClientStage;
  kyc_documents: Record<string, boolean>;
  transaction_volume: number;
  onboard_date: string | null;
  created_at: string;
  user_type?: string;
  first_name?: string;
  last_name?: string;
  registration_date?: string | null;
  onboarding_status?: string;
  engagement_status?: string;
  last_contact_date?: string | null;
  follow_up_required?: boolean;
  assigned_agent?: string;
  notes?: string;
}

export type DealStage = 'Prospect' | 'Contacted' | 'Proposal' | 'Negotiation' | 'Won' | 'Lost';

export interface Deal {
  id: string;
  company: string;
  contact: string;
  deal_value: number;
  assigned_bdm: string;
  probability: number;
  next_action: string;
  due_date: string;
  stage: DealStage;
  created_at: string;
}

export type Department = 'Sales' | 'Marketing' | 'Customer Success' | 'Engineering' | 'Design' | 'Operations';
export type EmploymentType = 'Full-time' | 'Part-time' | 'Contract';

export interface Employee {
  id: string;
  name: string;
  role: string;
  department: Department;
  employment_type: EmploymentType;
  email: string;
  phone: string;
  start_date: string;
  education: string;
  state_of_origin: string;
  bank_name: string;
  account_number: string;
  emergency_contact_name: string;
  emergency_contact_relationship: string;
  emergency_contact_phone: string;
  created_at: string;
}

export interface KpiTarget {
  id: string;
  department: Department;
  metric_name: string;
  target_value: number;
  current_value: number;
  month: string;
}

export interface SalesSettings {
  base_retainer: number;
  commission_percentage: number;
  monthly_target: number;
}

export type ProjectBoardColumn = 'Backlog' | 'To Do' | 'In Progress' | 'In Review' | 'Done';

export interface ProjectTask {
  id: string;
  title: string;
  description: string;
  column: ProjectBoardColumn;
  assignee: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  labels: string[];
  due_date: string | null;
  created_at: string;
}

export type AppRole = 'admin' | 'manager' | 'staff';

export const KYC_DOCUMENTS = [
  'Certificate of Incorporation',
  'Board Resolution',
  'Director ID Verification',
  'Proof of Address',
  'AML/CFT Policy Document',
] as const;

export const CLIENT_STAGES: ClientStage[] = ['Lead', 'KYC Submitted', 'KYC Review', 'Verified', 'Onboarded', 'Active'];
export const DEAL_STAGES: DealStage[] = ['Prospect', 'Contacted', 'Proposal', 'Negotiation', 'Won', 'Lost'];
export const DEPARTMENTS: Department[] = ['Sales', 'Marketing', 'Customer Success', 'Engineering', 'Design', 'Operations'];
export const BOARD_COLUMNS: ProjectBoardColumn[] = ['Backlog', 'To Do', 'In Progress', 'In Review', 'Done'];

export const DEPT_COLORS: Record<Department, string> = {
  Sales: 'bg-dept-sales/10 text-dept-sales',
  Marketing: 'bg-dept-marketing/10 text-dept-marketing',
  'Customer Success': 'bg-dept-cs/10 text-dept-cs',
  Engineering: 'bg-dept-engineering/10 text-dept-engineering',
  Design: 'bg-dept-design/10 text-dept-design',
  Operations: 'bg-dept-operations/10 text-dept-operations',
};

export const DEPT_BG: Record<Department, string> = {
  Sales: 'bg-dept-sales',
  Marketing: 'bg-dept-marketing',
  'Customer Success': 'bg-dept-cs',
  Engineering: 'bg-dept-engineering',
  Design: 'bg-dept-design',
  Operations: 'bg-dept-operations',
};
