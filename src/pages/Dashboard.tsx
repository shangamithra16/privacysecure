import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Key, Lock, Activity, Shield } from 'lucide-react';
import AppLayout from '@/components/AppLayout';

export default function Dashboard() {
  const { user, isAdmin } = useAuth();
  const [vaultCount, setVaultCount] = useState(0);
  const [logCount, setLogCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    supabase.from('vault_passwords').select('id', { count: 'exact', head: true }).eq('user_id', user.id).then(({ count }) => setVaultCount(count || 0));
    supabase.from('audit_logs').select('id', { count: 'exact', head: true }).eq('user_id', user.id).then(({ count }) => setLogCount(count || 0));
  }, [user]);

  const stats = [
    { label: 'Stored Passwords', value: vaultCount, icon: Lock, color: 'text-primary' },
    { label: 'Audit Events', value: logCount, icon: Activity, color: 'text-accent' },
    { label: 'Role', value: isAdmin ? 'Admin' : 'User', icon: Shield, color: 'text-warning' },
    { label: 'Encryption', value: 'AES-256', icon: Key, color: 'text-success' },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {user?.user_metadata?.name || user?.email}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map(s => (
            <Card key={s.label} className="animate-slide-in">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
                <s.icon className={`h-4 w-4 ${s.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{s.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Security Overview</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>✅ All passwords encrypted with AES-256-GCM before storage</p>
            <p>✅ Master password never stored — derived via PBKDF2 (310,000 iterations)</p>
            <p>✅ Authentication secured with JWT tokens</p>
            <p>✅ Role-based access control active</p>
            <p>✅ All vault operations logged for audit</p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
