import { useState, useMemo } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { ClientsModule } from '@/components/clients/ClientsModule';
import { TicketsModule } from '@/components/tickets/TicketsModule';
import { SalesModule } from '@/components/sales/SalesModule';
import { KpisModule } from '@/components/kpis/KpisModule';
import { HrModule } from '@/components/hr/HrModule';
import { ProjectsModule } from '@/components/projects/ProjectsModule';
import { AdminModule } from '@/components/admin/AdminModule';
import { LoginPage } from '@/components/auth/LoginPage';
import { FirstLoginPasswordModal } from '@/components/auth/FirstLoginPasswordModal';
import { AttentionQueue, type NavFilter } from '@/components/layout/AttentionQueue';
import { useAuth } from '@/hooks/useAuth';

type Tab = 'clients' | 'tickets' | 'sales' | 'kpis' | 'hr' | 'projects' | 'admin';

const ALL_TABS: Tab[] = ['clients', 'tickets', 'sales', 'kpis', 'hr', 'projects', 'admin'];

const Index = () => {
  const { user, role, department, loading, signOut, canView, canEdit } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('clients');

  const visibleTabs = useMemo(() => {
    if (!role) return [];
    return ALL_TABS.filter((tab) => canView(tab));
  }, [role, department]);

  // Default to first visible tab if current isn't visible
  const effectiveTab = visibleTabs.includes(activeTab) ? activeTab : visibleTabs[0] ?? 'clients';

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <AppShell
      activeTab={effectiveTab}
      onTabChange={setActiveTab}
      onLogout={signOut}
      userRole={role}
      visibleTabs={visibleTabs}
    >
      <FirstLoginPasswordModal />
      <AttentionQueue onNavigate={(t) => setActiveTab(t as Tab)} />
      {effectiveTab === 'clients' && <ClientsModule canEdit={canEdit('clients')} />}
      {effectiveTab === 'tickets' && <TicketsModule canEdit={canEdit('tickets')} />}
      {effectiveTab === 'sales' && <SalesModule canEdit={canEdit('sales')} />}
      {effectiveTab === 'kpis' && <KpisModule />}
      {effectiveTab === 'hr' && <HrModule canEdit={canEdit('hr')} />}
      {effectiveTab === 'projects' && <ProjectsModule canEdit={canEdit('projects')} />}
      {effectiveTab === 'admin' && <AdminModule />}
    </AppShell>
  );
};

export default Index;
