import { useState, useMemo } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { ClientsModule } from '@/components/clients/ClientsModule';
import { SalesModule } from '@/components/sales/SalesModule';
import { KpisModule } from '@/components/kpis/KpisModule';
import { HrModule } from '@/components/hr/HrModule';
import { ProjectsModule } from '@/components/projects/ProjectsModule';
import { LoginPage } from '@/components/auth/LoginPage';
import { useAuth } from '@/hooks/useAuth';

type Tab = 'clients' | 'sales' | 'kpis' | 'hr' | 'projects';

const ALL_TABS: Tab[] = ['clients', 'sales', 'kpis', 'hr', 'projects'];

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
      {effectiveTab === 'clients' && <ClientsModule canEdit={canEdit('clients')} />}
      {effectiveTab === 'sales' && <SalesModule canEdit={canEdit('sales')} />}
      {effectiveTab === 'kpis' && <KpisModule canEdit={canEdit('kpis')} />}
      {effectiveTab === 'hr' && <HrModule canEdit={canEdit('hr')} />}
      {effectiveTab === 'projects' && <ProjectsModule canEdit={canEdit('projects')} />}
    </AppShell>
  );
};

export default Index;
