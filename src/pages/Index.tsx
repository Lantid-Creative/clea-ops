import { useState, useMemo } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { ClientsModule } from '@/components/clients/ClientsModule';
import { TicketsModule } from '@/components/tickets/TicketsModule';
import { SalesModule } from '@/components/sales/SalesModule';
import { KpisModule } from '@/components/kpis/KpisModule';
import { HrModule } from '@/components/hr/HrModule';
import { ProjectsModule } from '@/components/projects/ProjectsModule';
import { AdminModule } from '@/components/admin/AdminModule';
import { MyWorkModule } from '@/components/mywork/MyWorkModule';
import { PaymentsModule } from '@/components/payments/PaymentsModule';
import { AuditLogModule } from '@/components/audit/AuditLogModule';
import { LoginPage } from '@/components/auth/LoginPage';
import { FirstLoginPasswordModal } from '@/components/auth/FirstLoginPasswordModal';
import { AttentionQueue, type NavFilter } from '@/components/layout/AttentionQueue';
import { useAuth } from '@/hooks/useAuth';

type Tab = 'mywork' | 'clients' | 'tickets' | 'sales' | 'payments' | 'kpis' | 'hr' | 'projects' | 'admin' | 'audit';

const ALL_TABS: Tab[] = ['mywork', 'clients', 'tickets', 'sales', 'payments', 'kpis', 'hr', 'projects', 'admin', 'audit'];

const Index = () => {
  const { user, role, department, loading, signOut, canView, canEdit } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('mywork');
  const [pendingFilter, setPendingFilter] = useState<NavFilter | undefined>(undefined);

  const navigateTo = (tab: Tab, filter?: NavFilter) => {
    setActiveTab(tab);
    setPendingFilter(filter);
  };

  const visibleTabs = useMemo(() => {
    if (!role) return [];
    return ALL_TABS.filter((tab) => canView(tab));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, department]);

  const effectiveTab = visibleTabs.includes(activeTab) ? activeTab : visibleTabs[0] ?? 'mywork';

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
      onTabChange={(t) => navigateTo(t as Tab, undefined)}
      onLogout={signOut}
      userRole={role}
      visibleTabs={visibleTabs}
    >
      <FirstLoginPasswordModal />
      {effectiveTab !== 'mywork' && effectiveTab !== 'audit' && <AttentionQueue />}
      {effectiveTab === 'mywork' && <MyWorkModule onNavigate={(t) => navigateTo(t as Tab)} />}
      {effectiveTab === 'clients' && <ClientsModule canEdit={canEdit('clients')} initialFilter={pendingFilter} />}
      {effectiveTab === 'tickets' && <TicketsModule canEdit={canEdit('tickets')} initialFilter={pendingFilter} />}
      {effectiveTab === 'sales' && <SalesModule canEdit={canEdit('sales')} />}
      {effectiveTab === 'payments' && <PaymentsModule canEdit={canEdit('payments')} />}
      {effectiveTab === 'kpis' && <KpisModule />}
      {effectiveTab === 'hr' && <HrModule canEdit={canEdit('hr')} />}
      {effectiveTab === 'projects' && <ProjectsModule canEdit={canEdit('projects')} />}
      {effectiveTab === 'admin' && <AdminModule />}
      {effectiveTab === 'audit' && <AuditLogModule />}
    </AppShell>
  );
};

export default Index;
