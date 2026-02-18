import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity } from 'lucide-react';

interface AuditLog {
  id: string;
  action: string;
  details: Record<string, unknown> | null;
  created_at: string;
  user_id: string;
}

export default function AuditLogs() {
  const { user, isAdmin } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    if (!user) return;
    const query = supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(100);
    if (!isAdmin) query.eq('user_id', user.id);
    query.then(({ data }) => setLogs((data as AuditLog[]) || []));
  }, [user, isAdmin]);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Audit Logs</h1>
          <p className="text-muted-foreground">{isAdmin ? 'All system activity' : 'Your activity log'}</p>
        </div>

        {logs.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-muted-foreground">No activity recorded yet</CardContent></Card>
        ) : (
          <div className="space-y-2">
            {logs.map(log => (
              <Card key={log.id} className="animate-fade-in">
                <CardContent className="py-3 flex items-center gap-3">
                  <Activity className="h-4 w-4 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-sm">{log.action}</span>
                    {log.details && Object.keys(log.details).length > 0 && (
                      <span className="text-xs text-muted-foreground ml-2 font-mono">
                        {JSON.stringify(log.details)}
                      </span>
                    )}
                  </div>
                  <time className="text-xs text-muted-foreground flex-shrink-0">
                    {new Date(log.created_at).toLocaleString()}
                  </time>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
