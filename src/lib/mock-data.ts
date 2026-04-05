import { Client, Deal, Employee, KpiTarget, ProjectTask, SalesSettings } from './types';

export const mockClients: Client[] = [
  { id: '1', company_name: 'Apex Fintech Ltd', contact_person: 'James Okafor', email: 'james@apexfintech.com', phone: '+234 801 234 5678', country: 'Nigeria', industry: 'Financial Services', assigned_specialist: 'Ada Eze', stage: 'Active', kyc_documents: { 'Certificate of Incorporation': true, 'Board Resolution': true, 'Director ID Verification': true, 'Proof of Address': true, 'AML/CFT Policy Document': true }, transaction_volume: 2450000, onboard_date: '2024-01-15', created_at: '2024-01-10' },
  { id: '2', company_name: 'Global Trade Co', contact_person: 'Sarah Chen', email: 'sarah@globaltrade.com', phone: '+852 9876 5432', country: 'Hong Kong', industry: 'Import/Export', assigned_specialist: 'Tunde Balogun', stage: 'KYC Review', kyc_documents: { 'Certificate of Incorporation': true, 'Board Resolution': true, 'Director ID Verification': false, 'Proof of Address': true, 'AML/CFT Policy Document': false }, transaction_volume: 890000, onboard_date: null, created_at: '2024-02-20' },
  { id: '3', company_name: 'EuroPay Solutions', contact_person: 'Maria Schmidt', email: 'maria@europay.de', phone: '+49 30 1234 5678', country: 'Germany', industry: 'Payments', assigned_specialist: 'Ada Eze', stage: 'Verified', kyc_documents: { 'Certificate of Incorporation': true, 'Board Resolution': true, 'Director ID Verification': true, 'Proof of Address': true, 'AML/CFT Policy Document': true }, transaction_volume: 5200000, onboard_date: null, created_at: '2024-03-05' },
  { id: '4', company_name: 'Naira Exchange', contact_person: 'Chidi Nwosu', email: 'chidi@nairaexchange.ng', phone: '+234 802 345 6789', country: 'Nigeria', industry: 'Currency Exchange', assigned_specialist: 'Tunde Balogun', stage: 'Lead', kyc_documents: { 'Certificate of Incorporation': false, 'Board Resolution': false, 'Director ID Verification': false, 'Proof of Address': false, 'AML/CFT Policy Document': false }, transaction_volume: 0, onboard_date: null, created_at: '2024-03-10' },
  { id: '5', company_name: 'Swift Remit Inc', contact_person: 'David Park', email: 'david@swiftremit.com', phone: '+1 212 555 0199', country: 'USA', industry: 'Remittance', assigned_specialist: 'Ada Eze', stage: 'Onboarded', kyc_documents: { 'Certificate of Incorporation': true, 'Board Resolution': true, 'Director ID Verification': true, 'Proof of Address': true, 'AML/CFT Policy Document': true }, transaction_volume: 1800000, onboard_date: '2024-02-28', created_at: '2024-02-01' },
  { id: '6', company_name: 'AsiaLink Pay', contact_person: 'Yuki Tanaka', email: 'yuki@asialinkpay.jp', phone: '+81 3 1234 5678', country: 'Japan', industry: 'Payments', assigned_specialist: 'Tunde Balogun', stage: 'KYC Submitted', kyc_documents: { 'Certificate of Incorporation': true, 'Board Resolution': false, 'Director ID Verification': false, 'Proof of Address': true, 'AML/CFT Policy Document': false }, transaction_volume: 0, onboard_date: null, created_at: '2024-03-15' },
];

export const mockDeals: Deal[] = [
  { id: '1', company: 'MegaCorp International', contact: 'John Smith', deal_value: 500000, assigned_bdm: 'Kemi Adeyemi', probability: 80, next_action: 'Send final proposal', due_date: '2024-04-15', stage: 'Negotiation', created_at: '2024-01-20' },
  { id: '2', company: 'TechFlow Solutions', contact: 'Emily Brown', deal_value: 250000, assigned_bdm: 'Femi Ogunlade', probability: 60, next_action: 'Schedule demo', due_date: '2024-04-10', stage: 'Proposal', created_at: '2024-02-15' },
  { id: '3', company: 'SafePay Africa', contact: 'Amina Bello', deal_value: 750000, assigned_bdm: 'Kemi Adeyemi', probability: 95, next_action: 'Contract signing', due_date: '2024-04-01', stage: 'Won', created_at: '2024-01-05' },
  { id: '4', company: 'Nordic Transfers', contact: 'Erik Larsson', deal_value: 180000, assigned_bdm: 'Femi Ogunlade', probability: 30, next_action: 'Follow up call', due_date: '2024-04-20', stage: 'Contacted', created_at: '2024-03-01' },
  { id: '5', company: 'LatAm Payments', contact: 'Carlos Rivera', deal_value: 420000, assigned_bdm: 'Kemi Adeyemi', probability: 10, next_action: 'Initial outreach', due_date: '2024-04-25', stage: 'Prospect', created_at: '2024-03-10' },
  { id: '6', company: 'Gulf Remit', contact: 'Ahmed Al-Hassan', deal_value: 300000, assigned_bdm: 'Femi Ogunlade', probability: 0, next_action: 'Closed - budget constraints', due_date: '2024-03-15', stage: 'Lost', created_at: '2024-01-15' },
];

export const mockEmployees: Employee[] = [
  { id: '1', name: 'Kemi Adeyemi', role: 'Business Development Manager', department: 'Sales', employment_type: 'Full-time', email: 'kemi@cleaops.com', phone: '+234 801 111 2222', start_date: '2023-01-15', education: 'MBA, Lagos Business School', state_of_origin: 'Lagos', bank_name: 'First Bank', account_number: '2012345678', emergency_contact_name: 'Bola Adeyemi', emergency_contact_relationship: 'Spouse', emergency_contact_phone: '+234 802 333 4444', created_at: '2023-01-15' },
  { id: '2', name: 'Femi Ogunlade', role: 'Business Development Manager', department: 'Sales', employment_type: 'Full-time', email: 'femi@cleaops.com', phone: '+234 802 222 3333', start_date: '2023-03-01', education: 'BSc Economics, University of Ibadan', state_of_origin: 'Oyo', bank_name: 'GTBank', account_number: '0123456789', emergency_contact_name: 'Yemi Ogunlade', emergency_contact_relationship: 'Sibling', emergency_contact_phone: '+234 803 444 5555', created_at: '2023-03-01' },
  { id: '3', name: 'Ada Eze', role: 'Customer Onboarding Specialist', department: 'Customer Success', employment_type: 'Full-time', email: 'ada@cleaops.com', phone: '+234 803 333 4444', start_date: '2023-02-01', education: 'BSc Computer Science, UNILAG', state_of_origin: 'Anambra', bank_name: 'Access Bank', account_number: '1234567890', emergency_contact_name: 'Chukwu Eze', emergency_contact_relationship: 'Father', emergency_contact_phone: '+234 804 555 6666', created_at: '2023-02-01' },
  { id: '4', name: 'Tunde Balogun', role: 'Customer Onboarding Specialist', department: 'Customer Success', employment_type: 'Full-time', email: 'tunde@cleaops.com', phone: '+234 804 444 5555', start_date: '2023-04-15', education: 'MSc Finance, Covenant University', state_of_origin: 'Osun', bank_name: 'UBA', account_number: '3456789012', emergency_contact_name: 'Funke Balogun', emergency_contact_relationship: 'Spouse', emergency_contact_phone: '+234 805 666 7777', created_at: '2023-04-15' },
  { id: '5', name: 'Oluchi Nnamdi', role: 'Marketing Lead', department: 'Marketing', employment_type: 'Full-time', email: 'oluchi@cleaops.com', phone: '+234 805 555 6666', start_date: '2023-05-01', education: 'BSc Mass Communication, UNILAG', state_of_origin: 'Imo', bank_name: 'Zenith Bank', account_number: '4567890123', emergency_contact_name: 'Emeka Nnamdi', emergency_contact_relationship: 'Brother', emergency_contact_phone: '+234 806 777 8888', created_at: '2023-05-01' },
  { id: '6', name: 'Segun Ajayi', role: 'Senior Engineer', department: 'Engineering', employment_type: 'Full-time', email: 'segun@cleaops.com', phone: '+234 806 666 7777', start_date: '2023-01-10', education: 'MSc Computer Engineering, OAU', state_of_origin: 'Ondo', bank_name: 'Kuda Bank', account_number: '5678901234', emergency_contact_name: 'Bimpe Ajayi', emergency_contact_relationship: 'Spouse', emergency_contact_phone: '+234 807 888 9999', created_at: '2023-01-10' },
  { id: '7', name: 'Ngozi Obi', role: 'Product Designer', department: 'Design', employment_type: 'Full-time', email: 'ngozi@cleaops.com', phone: '+234 807 777 8888', start_date: '2023-06-01', education: 'BFA Design, Pan-Atlantic University', state_of_origin: 'Enugu', bank_name: 'Sterling Bank', account_number: '6789012345', emergency_contact_name: 'Chioma Obi', emergency_contact_relationship: 'Mother', emergency_contact_phone: '+234 808 999 0000', created_at: '2023-06-01' },
  { id: '8', name: 'Aisha Mohammed', role: 'Operations Manager', department: 'Operations', employment_type: 'Full-time', email: 'aisha@cleaops.com', phone: '+234 808 888 9999', start_date: '2023-02-15', education: 'MBA, ABU Zaria', state_of_origin: 'Kano', bank_name: 'First Bank', account_number: '7890123456', emergency_contact_name: 'Ibrahim Mohammed', emergency_contact_relationship: 'Spouse', emergency_contact_phone: '+234 809 000 1111', created_at: '2023-02-15' },
  { id: '9', name: 'Chidinma Okeke', role: 'Frontend Developer', department: 'Engineering', employment_type: 'Contract', email: 'chidinma@cleaops.com', phone: '+234 809 999 0000', start_date: '2024-01-15', education: 'BSc Software Engineering, Babcock University', state_of_origin: 'Delta', bank_name: 'GTBank', account_number: '8901234567', emergency_contact_name: 'Nkechi Okeke', emergency_contact_relationship: 'Sister', emergency_contact_phone: '+234 810 111 2222', created_at: '2024-01-15' },
  { id: '10', name: 'Damilola Adekunle', role: 'Content Strategist', department: 'Marketing', employment_type: 'Part-time', email: 'dami@cleaops.com', phone: '+234 810 000 1111', start_date: '2024-02-01', education: 'BA English, UI', state_of_origin: 'Ekiti', bank_name: 'Access Bank', account_number: '9012345678', emergency_contact_name: 'Tayo Adekunle', emergency_contact_relationship: 'Father', emergency_contact_phone: '+234 811 222 3333', created_at: '2024-02-01' },
];

export const mockKpis: KpiTarget[] = [
  // Sales
  { id: '1', department: 'Sales', metric_name: 'Monthly Revenue', target_value: 2000000, current_value: 1650000, month: '2024-03' },
  { id: '2', department: 'Sales', metric_name: 'New Deals Closed', target_value: 15, current_value: 11, month: '2024-03' },
  { id: '3', department: 'Sales', metric_name: 'Pipeline Value', target_value: 5000000, current_value: 3900000, month: '2024-03' },
  { id: '4', department: 'Sales', metric_name: 'Average Deal Size', target_value: 350000, current_value: 380000, month: '2024-03' },
  { id: '5', department: 'Sales', metric_name: 'Win Rate', target_value: 40, current_value: 35, month: '2024-03' },
  // Marketing
  { id: '6', department: 'Marketing', metric_name: 'Qualified Leads', target_value: 200, current_value: 175, month: '2024-03' },
  { id: '7', department: 'Marketing', metric_name: 'Website Visitors', target_value: 50000, current_value: 42000, month: '2024-03' },
  { id: '8', department: 'Marketing', metric_name: 'Conversion Rate', target_value: 5, current_value: 4.2, month: '2024-03' },
  { id: '9', department: 'Marketing', metric_name: 'Content Published', target_value: 20, current_value: 18, month: '2024-03' },
  { id: '10', department: 'Marketing', metric_name: 'Social Engagement', target_value: 10000, current_value: 8500, month: '2024-03' },
  // Customer Success
  { id: '11', department: 'Customer Success', metric_name: 'Client Retention Rate', target_value: 95, current_value: 93, month: '2024-03' },
  { id: '12', department: 'Customer Success', metric_name: 'NPS Score', target_value: 70, current_value: 68, month: '2024-03' },
  { id: '13', department: 'Customer Success', metric_name: 'Avg. Resolution Time (hrs)', target_value: 4, current_value: 3.5, month: '2024-03' },
  { id: '14', department: 'Customer Success', metric_name: 'Clients Onboarded', target_value: 20, current_value: 16, month: '2024-03' },
  { id: '15', department: 'Customer Success', metric_name: 'CSAT Score', target_value: 90, current_value: 87, month: '2024-03' },
  // Engineering
  { id: '16', department: 'Engineering', metric_name: 'Sprint Velocity', target_value: 80, current_value: 72, month: '2024-03' },
  { id: '17', department: 'Engineering', metric_name: 'Bug Resolution Rate', target_value: 95, current_value: 91, month: '2024-03' },
  { id: '18', department: 'Engineering', metric_name: 'Uptime %', target_value: 99.9, current_value: 99.85, month: '2024-03' },
  { id: '19', department: 'Engineering', metric_name: 'Deploy Frequency', target_value: 20, current_value: 18, month: '2024-03' },
  { id: '20', department: 'Engineering', metric_name: 'Code Review Turnaround (hrs)', target_value: 8, current_value: 6, month: '2024-03' },
  // Design
  { id: '21', department: 'Design', metric_name: 'Design Deliverables', target_value: 15, current_value: 12, month: '2024-03' },
  { id: '22', department: 'Design', metric_name: 'User Research Sessions', target_value: 8, current_value: 6, month: '2024-03' },
  { id: '23', department: 'Design', metric_name: 'Design System Updates', target_value: 10, current_value: 9, month: '2024-03' },
  { id: '24', department: 'Design', metric_name: 'Prototype Iterations', target_value: 25, current_value: 20, month: '2024-03' },
  { id: '25', department: 'Design', metric_name: 'Accessibility Score', target_value: 100, current_value: 92, month: '2024-03' },
  // Operations
  { id: '26', department: 'Operations', metric_name: 'Transaction Success Rate', target_value: 99.5, current_value: 99.2, month: '2024-03' },
  { id: '27', department: 'Operations', metric_name: 'Compliance Audits Passed', target_value: 5, current_value: 5, month: '2024-03' },
  { id: '28', department: 'Operations', metric_name: 'Vendor SLA Compliance', target_value: 98, current_value: 96, month: '2024-03' },
  { id: '29', department: 'Operations', metric_name: 'Cost Savings ($)', target_value: 100000, current_value: 78000, month: '2024-03' },
  { id: '30', department: 'Operations', metric_name: 'Process Automation %', target_value: 60, current_value: 45, month: '2024-03' },
];

export const mockTasks: ProjectTask[] = [
  { id: '1', title: 'Implement KYC document upload', description: 'Build file upload flow for KYC documents with validation and status tracking', column: 'In Progress', assignee: 'Segun Ajayi', priority: 'High', labels: ['Engineering', 'Compliance'], due_date: '2024-04-10', created_at: '2024-03-20' },
  { id: '2', title: 'Design onboarding flow v2', description: 'Redesign the client onboarding experience based on user feedback', column: 'In Review', assignee: 'Ngozi Obi', priority: 'Medium', labels: ['Design', 'UX'], due_date: '2024-04-08', created_at: '2024-03-18' },
  { id: '3', title: 'Set up compliance monitoring', description: 'Create automated compliance checks for transaction monitoring', column: 'To Do', assignee: 'Aisha Mohammed', priority: 'High', labels: ['Operations', 'Compliance'], due_date: '2024-04-15', created_at: '2024-03-22' },
  { id: '4', title: 'Sales Q2 strategy document', description: 'Draft the Q2 sales strategy with regional targets', column: 'To Do', assignee: 'Kemi Adeyemi', priority: 'Medium', labels: ['Sales', 'Strategy'], due_date: '2024-04-05', created_at: '2024-03-25' },
  { id: '5', title: 'Fix settlement calculation bug', description: 'Settlement amounts are rounding incorrectly for JPY transactions', column: 'In Progress', assignee: 'Chidinma Okeke', priority: 'Urgent', labels: ['Engineering', 'Bug'], due_date: '2024-04-02', created_at: '2024-03-28' },
  { id: '6', title: 'Launch partner referral program', description: 'Marketing campaign for the new partner referral incentive', column: 'Backlog', assignee: 'Oluchi Nnamdi', priority: 'Low', labels: ['Marketing'], due_date: '2024-05-01', created_at: '2024-03-15' },
  { id: '7', title: 'API documentation update', description: 'Update API docs with new endpoints for batch payments', column: 'Done', assignee: 'Segun Ajayi', priority: 'Medium', labels: ['Engineering', 'Docs'], due_date: '2024-03-30', created_at: '2024-03-10' },
  { id: '8', title: 'Customer feedback survey', description: 'Design and distribute Q1 customer satisfaction survey', column: 'Done', assignee: 'Ada Eze', priority: 'Low', labels: ['Customer Success'], due_date: '2024-03-28', created_at: '2024-03-05' },
];

export const defaultSalesSettings: SalesSettings = {
  base_retainer: 50000,
  commission_percentage: 5,
  monthly_target: 2000000,
};

export const companyTarget = {
  metric: 'Monthly Transaction Volume',
  target: 50000000,
  current: 38500000,
  avgTransactionSize: 5000,
};
