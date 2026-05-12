import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, Mail, User, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

type Mode = 'login' | 'signup' | 'forgot';

export function LoginPage() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email');
      return;
    }
    if (!email.endsWith('@tryclea.com')) {
      toast.error('Only @tryclea.com email addresses are allowed');
      return;
    }

    if (mode === 'forgot') {
      setLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      setLoading(false);
      if (error) toast.error(error.message);
      else {
        toast.success('Password reset link sent. Check your inbox.');
        setMode('login');
      }
      return;
    }

    if (!password || (mode === 'signup' && !fullName)) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    if (mode === 'login') {
      const { error } = await signIn(email, password);
      if (error) toast.error(error);
      else toast.success('Welcome back to Clea Ops');
    } else {
      const { error } = await signUp(email, password, fullName);
      if (error) toast.error(error);
      else toast.success('Account created! Check your email to verify.');
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary font-bold text-primary-foreground text-xl">
            C
          </div>
          <h1 className="text-2xl font-bold">Clea Ops</h1>
          <p className="text-sm text-muted-foreground">
            {mode === 'forgot' ? 'Reset your password' : 'Internal Operations Portal'}
          </p>
          {mode !== 'forgot' && (
            <p className="text-xs text-muted-foreground">Authorized personnel only</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="fullName" placeholder="Your full name" value={fullName} onChange={(e) => setFullName(e.target.value)} className="pl-9" />
              </div>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="email" type="email" placeholder="you@tryclea.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9" />
            </div>
          </div>
          {mode !== 'forgot' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => setMode('forgot')}
                    className="text-xs text-primary hover:underline"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="password" type="password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-9" />
              </div>
            </div>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading
              ? 'Please wait...'
              : mode === 'login'
              ? 'Sign In'
              : mode === 'signup'
              ? 'Create Account'
              : 'Send Reset Link'}
          </Button>
        </form>

        <div className="text-center">
          {mode === 'login' && (
            <button onClick={() => setMode('signup')} className="text-sm text-primary hover:underline">
              New team member? Create your account
            </button>
          )}
          {mode === 'signup' && (
            <button onClick={() => setMode('login')} className="text-sm text-primary hover:underline flex items-center justify-center gap-1 mx-auto">
              <ArrowLeft className="h-3 w-3" /> Back to sign in
            </button>
          )}
          {mode === 'forgot' && (
            <button onClick={() => setMode('login')} className="text-sm text-primary hover:underline flex items-center justify-center gap-1 mx-auto">
              <ArrowLeft className="h-3 w-3" /> Back to sign in
            </button>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Only @tryclea.com emails are accepted. Contact IT if you need access.
        </p>
      </div>
    </div>
  );
}
