import { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { ClientsModule } from '@/components/clients/ClientsModule';
import { SalesModule } from '@/components/sales/SalesModule';
import { KpisModule } from '@/components/kpis/KpisModule';
import { HrModule } from '@/components/hr/HrModule';
import { ProjectsModule } from '@/components/projects/ProjectsModule';
import { LoginPage } from '@/components/auth/LoginPage';

type Tab = 'clients' | 'sales' | 'kpis' | 'hr' | 'projects';

const Index = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('clients');

  if (!isLoggedIn) {
    return <LoginPage onLogin={() => setIsLoggedIn(true)} />;
  }

  return (
    <AppShell activeTab={activeTab} onTabChange={setActiveTab} onLogout={() => setIsLoggedIn(false)}>
      {activeTab === 'clients' && <ClientsModule />}
      {activeTab === 'sales' && <SalesModule />}
      {activeTab === 'kpis' && <KpisModule />}
      {activeTab === 'hr' && <HrModule />}
      {activeTab === 'projects' && <ProjectsModule />}
    </AppShell>
  );
};

export default Index;
