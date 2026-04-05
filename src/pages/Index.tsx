import { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { ClientsModule } from '@/components/clients/ClientsModule';
import { SalesModule } from '@/components/sales/SalesModule';
import { KpisModule } from '@/components/kpis/KpisModule';
import { HrModule } from '@/components/hr/HrModule';
import { ProjectsModule } from '@/components/projects/ProjectsModule';
import { LoginPage } from '@/components/auth/LoginPage';
import { useAuth } from '@/hooks/useAuth';

type Tab = 'clients' | 'sales' | 'kpis' | 'hr' | 'projects';

const Index = () => {
  const { user, role, loading, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('clients');

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
    <AppShell activeTab={activeTab} onTabChange={setActiveTab} onLogout={signOut} userRole={role}>
      {activeTab === 'clients' && <ClientsModule />}
      {activeTab === 'sales' && <SalesModule />}
      {activeTab === 'kpis' && <KpisModule />}
      {activeTab === 'hr' && <HrModule />}
      {activeTab === 'projects' && <ProjectsModule />}
    </AppShell>
  );
};

export default Index;
