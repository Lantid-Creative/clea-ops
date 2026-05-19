import { useState } from 'react';
import { Users, BarChart3, Target, UserCog, LayoutDashboard, LogOut, Shield, Ticket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProfileDialog } from '@/components/profile/ProfileDialog';
import cleaLogo from '@/assets/clea-logo.png';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';

type Tab = 'clients' | 'tickets' | 'sales' | 'kpis' | 'hr' | 'projects' | 'admin';

interface AppShellProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  children: React.ReactNode;
  onLogout: () => void;
  userRole?: string | null;
  visibleTabs?: Tab[];
}

const allTabs: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'clients', label: 'Customers', icon: Users },
  { id: 'tickets', label: 'Tickets', icon: Ticket },
  { id: 'sales', label: 'Sales', icon: BarChart3 },
  { id: 'kpis', label: 'KPIs', icon: Target },
  { id: 'hr', label: 'HR', icon: UserCog },
  { id: 'projects', label: 'Projects', icon: LayoutDashboard },
  { id: 'admin', label: 'Admin', icon: Shield },
];

const tabLabels: Record<Tab, string> = {
  clients: 'Customer Onboarding & Compliance',
  tickets: 'Tickets & Support',
  sales: 'Sales Pipeline & Commission',
  kpis: 'KPI Dashboard',
  hr: 'HR Directory',
  projects: 'Project Management',
  admin: 'Team Administration',
};

function AppSidebarNav({
  tabs,
  activeTab,
  onTabChange,
}: {
  tabs: typeof allTabs;
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}) {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-2 px-1 py-1">
          <img src={cleaLogo} alt="Clea" className="h-8 w-auto shrink-0 object-contain" />
          {!collapsed && <span className="text-sm font-bold">Ops</span>}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <SidebarMenuItem key={tab.id}>
                    <SidebarMenuButton
                      isActive={activeTab === tab.id}
                      onClick={() => onTabChange(tab.id)}
                      tooltip={tab.label}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{tab.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

export function AppShell({ activeTab, onTabChange, children, onLogout, userRole, visibleTabs }: AppShellProps) {
  const tabs = visibleTabs ? allTabs.filter((t) => visibleTabs.includes(t.id)) : allTabs;
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-gradient-to-br from-[hsl(221,100%,97%)] via-background to-[hsl(221,100%,95%)]">
        <AppSidebarNav tabs={tabs} activeTab={activeTab} onTabChange={onTabChange} />

        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border/60 bg-card/80 backdrop-blur px-5">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <img src={cleaLogo} alt="Clea" className="h-8 w-auto object-contain" />
              <div>
                <h1 className="text-base font-bold leading-none tracking-tight">Ops</h1>
                <p className="text-xs text-muted-foreground hidden sm:block mt-0.5">{tabLabels[activeTab]}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {userRole && (
                <span className="text-xs font-medium text-muted-foreground capitalize hidden sm:inline px-2.5 py-1 rounded-full bg-secondary">{userRole}</span>
              )}
              <Button variant="ghost" size="icon" onClick={onLogout} className="h-9 w-9 rounded-full">
                <LogOut className="h-4 w-4" />
              </Button>
              <button
                onClick={() => setProfileOpen(true)}
                className="flex h-9 w-9 items-center justify-center rounded-full brand-gradient text-xs font-semibold text-primary-foreground shadow-md hover:shadow-lg transition-shadow"
                title="My profile"
              >
                {userRole ? userRole.charAt(0).toUpperCase() : 'U'}
              </button>
            </div>
          </header>
          <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />

          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
