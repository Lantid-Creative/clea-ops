import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfileDialog({ open, onOpenChange }: Props) {
  const { user, role, department } = useAuth();
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [pwd, setPwd] = useState('');
  const [pwd2, setPwd2] = useState('');
  const [savingPwd, setSavingPwd] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        setFullName(data?.full_name ?? '');
        setAvatarUrl(data?.avatar_url ?? '');
      });
  }, [open, user]);

  const saveProfile = async () => {
    if (!user) return;
    setLoading(true);
    const { error } = await supabase
      .from('profiles')
      .upsert(
        { user_id: user.id, full_name: fullName, avatar_url: avatarUrl || null },
        { onConflict: 'user_id' },
      );
    setLoading(false);
    if (error) toast.error(error.message);
    else toast.success('Profile updated');
  };

  const changePassword = async () => {
    if (pwd.length < 8) return toast.error('Password must be at least 8 characters');
    if (pwd !== pwd2) return toast.error('Passwords do not match');
    setSavingPwd(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setSavingPwd(false);
    if (error) toast.error(error.message);
    else {
      toast.success('Password updated');
      setPwd('');
      setPwd2('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>My Profile</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            {avatarUrl ? (
              <img src={avatarUrl} alt="avatar" className="h-14 w-14 rounded-full object-cover" />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-lg font-semibold text-primary-foreground">
                {(fullName || user?.email || 'U').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="text-sm">
              <div className="font-medium">{user?.email}</div>
              <div className="text-muted-foreground capitalize">
                {role}{department ? ` · ${department.replace('_', ' ')}` : ''}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="full_name">Full name</Label>
            <Input id="full_name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="avatar_url">Avatar URL</Label>
            <Input id="avatar_url" placeholder="https://..." value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} />
          </div>
          <Button onClick={saveProfile} disabled={loading} className="w-full">
            {loading ? 'Saving...' : 'Save profile'}
          </Button>

          <Separator />

          <div className="space-y-2">
            <Label>Change password</Label>
            <Input type="password" placeholder="New password" value={pwd} onChange={(e) => setPwd(e.target.value)} />
            <Input type="password" placeholder="Confirm password" value={pwd2} onChange={(e) => setPwd2(e.target.value)} />
            <Button variant="outline" onClick={changePassword} disabled={savingPwd} className="w-full">
              {savingPwd ? 'Updating...' : 'Update password'}
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
