import { Users, BarChart3, Target, UserCog, LayoutDashboard, LogOut, Shield, Ticket, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Tab = 'clients' | 'tickets' | 'inbox' | 'sales' | 'kpis' | 'hr' | 'projects' | 'admin';

interface AppShellProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  children: React.ReactNode;
  onLogout: () => void;
  userRole?: string | null;
  visibleTabs?: Tab[];
}

const allTabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'clients', label: 'Clients', icon: <Users className="h-5 w-5" /> },
  { id: 'tickets', label: 'Tickets', icon: <Ticket className="h-5 w-5" /> },
  { id: 'inbox', label: 'Inbox', icon: <Mail className="h-5 w-5" /> },
  { id: 'sales', label: 'Sales', icon: <BarChart3 className="h-5 w-5" /> },
  { id: 'kpis', label: 'KPIs', icon: <Target className="h-5 w-5" /> },
  { id: 'hr', label: 'HR', icon: <UserCog className="h-5 w-5" /> },
  { id: 'projects', label: 'Projects', icon: <LayoutDashboard className="h-5 w-5" /> },
  { id: 'admin', label: 'Admin', icon: <Shield className="h-5 w-5" /> },
];

const tabLabels: Record<Tab, string> = {
  clients: 'Client Onboarding & Compliance',
  tickets: 'Tickets & Support',
  inbox: 'My Mailbox',
  sales: 'Sales Pipeline & Commission',
  kpis: 'KPI Dashboard',
  hr: 'HR Directory',
  projects: 'Project Management',
  admin: 'Team Administration',
};

export function AppShell({ activeTab, onTabChange, children, onLogout, userRole, visibleTabs }: AppShellProps) {
  const tabs = visibleTabs ? allTabs.filter((t) => visibleTabs.includes(t.id)) : allTabs;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top Header */}
      <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b bg-card px-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary font-bold text-primary-foreground text-sm">
            C
          </div>
          <div>
            <h1 className="text-sm font-bold leading-none">Clea Ops</h1>
            <p className="text-xs text-muted-foreground hidden sm:block">{tabLabels[activeTab]}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {userRole && (
            <span className="text-xs text-muted-foreground capitalize hidden sm:inline">{userRole}</span>
          )}
          <Button variant="ghost" size="icon" onClick={onLogout} className="h-8 w-8">
            <LogOut className="h-4 w-4" />
          </Button>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground" title={userRole ? `Role: ${userRole}` : undefined}>
            {userRole ? userRole.charAt(0).toUpperCase() : 'U'}
          </div>
        </div>
      </header>

      {/* Desktop tabs */}
      <nav className="hidden border-b bg-card px-4 md:flex">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Content */}
      <main className="flex-1 overflow-auto pb-20 md:pb-4">
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex border-t bg-card shadow-lg md:hidden">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-xs transition-colors ${
              activeTab === tab.id ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            {tab.icon}
            <span className="truncate">{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
