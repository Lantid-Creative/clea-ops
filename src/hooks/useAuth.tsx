import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export type AppRole = 'admin' | 'manager' | 'staff';
export type AppDepartment =
  | 'support'
  | 'onboarding'
  | 'sales'
  | 'compliance'
  | 'finance'
  | 'hr'
  | 'product_dev'
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Maps each department to the tabs its staff can see.
// Managers see everything (read-only outside their dept); admins see all.
const DEPARTMENT_TAB_MAP: Record<AppDepartment, string[]> = {
  support: ['tickets', 'clients', 'kpis'],
  onboarding: ['clients', 'kpis'],
  sales: ['sales', 'clients', 'kpis'],
  compliance: ['clients', 'kpis'], // KYC read-only per plan
  finance: ['kpis', 'hr'],
  hr: ['hr', 'kpis'],
  product_dev: ['projects', 'tickets', 'kpis'],
  // legacy mappings
  marketing: ['kpis'],
  customer_success: ['clients', 'tickets', 'kpis'],
  engineering: ['projects', 'kpis', 'tickets'],
  design: ['projects', 'kpis'],
  operations: ['clients', 'hr', 'kpis', 'tickets'],
};

// Departments whose access to a given tab is read-only even for managers
const READ_ONLY_OVERRIDES: Partial<Record<AppDepartment, string[]>> = {
  compliance: ['clients'], // Compliance staff/managers can view KYC but not edit
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

  const canView = (tab: string): boolean => {
    if (!role) return false;
    if (tab === 'admin') return role === 'admin';
    if (role === 'admin') return true;
    if (role === 'manager') return true; // managers see all tabs (read-only on other depts)
    // Staff: only their department's tabs
    if (!department) return false;
    return DEPARTMENT_TAB_MAP[department]?.includes(tab) ?? false;
  };

  const canEdit = (tab: string): boolean => {
    if (!role) return false;
    if (tab === 'admin') return role === 'admin';
    if (role === 'admin') return true;
    if (role === 'manager') {
      if (!department) return false;
      const allowed = DEPARTMENT_TAB_MAP[department]?.includes(tab) ?? false;
      const readOnly = READ_ONLY_OVERRIDES[department]?.includes(tab) ?? false;
      return allowed && !readOnly;
    }
    return false;
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
    <AuthContext.Provider value={{ session, user, role, department, loading, signUp, signIn, signOut, canEdit, canView }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
