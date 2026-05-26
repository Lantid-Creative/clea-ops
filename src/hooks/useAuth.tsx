import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export type AppRole = 'admin' | 'super_admin' | 'manager' | 'staff';
export type AppDepartment =
  | 'support'
  | 'onboarding'
  | 'sales'
  | 'compliance'
  | 'finance'
  | 'hr'
  | 'product_dev'
  | 'payments_ops'
  // legacy values kept for backward compatibility with existing rows
  | 'marketing'
  | 'customer_success'
  | 'engineering'
  | 'design'
  | 'operations';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: AppRole | null;
  department: AppDepartment | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  canEdit: (tab: string) => boolean;
  canView: (tab: string) => boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Maps each department to the tabs its staff can see. 'mywork' is everyone.
const DEPARTMENT_TAB_MAP: Record<AppDepartment, string[]> = {
  support: ['mywork', 'tickets', 'clients', 'kpis'],
  onboarding: ['mywork', 'clients', 'kpis'],
  sales: ['mywork', 'sales', 'clients', 'kpis'],
  compliance: ['mywork', 'clients', 'kpis'],
  finance: ['mywork', 'kpis', 'payments', 'hr'],
  hr: ['mywork', 'hr', 'kpis'],
  product_dev: ['mywork', 'projects', 'tickets', 'kpis'],
  payments_ops: ['mywork', 'payments', 'clients', 'kpis'],
  marketing: ['mywork', 'kpis'],
  customer_success: ['mywork', 'clients', 'tickets', 'kpis'],
  engineering: ['mywork', 'projects', 'kpis', 'tickets'],
  design: ['mywork', 'projects', 'kpis'],
  operations: ['mywork', 'clients', 'hr', 'kpis', 'tickets', 'payments'],
};

const READ_ONLY_OVERRIDES: Partial<Record<AppDepartment, string[]>> = {
  compliance: ['clients'],
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [department, setDepartment] = useState<AppDepartment | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRoleAndDept = async (userId: string) => {
    const { data } = await supabase
      .from('user_roles')
      .select('role, department, is_active')
      .eq('user_id', userId)
      .single();
    if (data && data.is_active === false) {
      await supabase.auth.signOut();
      setRole(null);
      setDepartment(null);
      return;
    }
    setRole((data?.role as AppRole) ?? 'staff');
    setDepartment((data?.department as AppDepartment) ?? null);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(() => fetchRoleAndDept(session.user.id), 0);
      } else {
        setRole(null);
        setDepartment(null);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchRoleAndDept(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const isAdmin = role === 'admin' || role === 'super_admin';
  const isSuperAdmin = role === 'super_admin';

  const canView = (tab: string): boolean => {
    if (!role) return false;
    if (tab === 'mywork') return true;
    if (tab === 'admin' || tab === 'audit') return isAdmin;
    if (isAdmin) return true;
    if (role === 'manager') return true; // managers see all tabs (read-only on other depts)
    if (!department) return false;
    return DEPARTMENT_TAB_MAP[department]?.includes(tab) ?? false;
  };

  const canEdit = (tab: string): boolean => {
    if (!role) return false;
    if (tab === 'mywork') return true;
    if (tab === 'admin' || tab === 'audit') return isAdmin;
    if (isAdmin) return true;
    if (!department) return false;
    const allowed = DEPARTMENT_TAB_MAP[department]?.includes(tab) ?? false;
    const readOnly = READ_ONLY_OVERRIDES[department]?.includes(tab) ?? false;
    return allowed && !readOnly;
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    if (!email.endsWith('@tryclea.com')) {
      return { error: 'Only @tryclea.com email addresses are allowed.' };
    }
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    return { error: error?.message ?? null };
  };

  const signIn = async (email: string, password: string) => {
    if (!email.endsWith('@tryclea.com')) {
      return { error: 'Only @tryclea.com email addresses are allowed.' };
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{ session, user, role, department, loading, signUp, signIn, signOut, canEdit, canView, isAdmin, isSuperAdmin }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
