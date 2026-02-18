import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { encryptPassword, decryptPassword, encryptVaultExport, decryptVaultImport } from '@/lib/encryption';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Eye, EyeOff, Trash2, Download, Upload, Lock, Search } from 'lucide-react';
import { toast } from 'sonner';

interface VaultEntry {
  id: string;
  service_name: string;
  username: string;
  encrypted_password: string;
  iv: string;
  notes: string | null;
  created_at: string;
}

export default function Vault() {
  const { user, logAudit } = useAuth();
  const [entries, setEntries] = useState<VaultEntry[]>([]);
  const [search, setSearch] = useState('');
  const [masterPassword, setMasterPassword] = useState('');
  const [masterUnlocked, setMasterUnlocked] = useState(false);
  const [decrypted, setDecrypted] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
  const [addOpen, setAddOpen] = useState(false);
  const [newService, setNewService] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchEntries = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('vault_passwords').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    setEntries((data as VaultEntry[]) || []);
  }, [user]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const unlockMaster = () => {
    if (masterPassword.length < 4) { toast.error('Enter your master password'); return; }
    setMasterUnlocked(true);
    toast.success('Vault unlocked');
  };

  const addEntry = async () => {
    if (!user || !masterPassword) return;
    setSaving(true);
    try {
      const { encrypted, iv } = await encryptPassword(newPassword, masterPassword);
      const { error } = await supabase.from('vault_passwords').insert({
        user_id: user.id,
        service_name: newService,
        username: newUsername,
        encrypted_password: encrypted,
        iv,
        notes: newNotes || null,
      });
      if (error) throw error;
      await logAudit('vault_add', { service: newService });
      toast.success('Password saved securely');
      setAddOpen(false);
      setNewService(''); setNewUsername(''); setNewPassword(''); setNewNotes('');
      fetchEntries();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const revealPassword = async (entry: VaultEntry) => {
    if (decrypted[entry.id]) {
      setShowPassword(p => ({ ...p, [entry.id]: !p[entry.id] }));
      return;
    }
    try {
      const plain = await decryptPassword(entry.encrypted_password, entry.iv, masterPassword);
      setDecrypted(d => ({ ...d, [entry.id]: plain }));
      setShowPassword(p => ({ ...p, [entry.id]: true }));
    } catch {
      toast.error('Decryption failed. Wrong master password?');
    }
  };

  const deleteEntry = async (id: string, service: string) => {
    await supabase.from('vault_passwords').delete().eq('id', id);
    await logAudit('vault_delete', { service });
    toast.success('Entry deleted');
    fetchEntries();
  };

  const exportVault = async () => {
    if (!masterPassword) return;
    try {
      const plainEntries = await Promise.all(
        entries.map(async e => {
          const plain = decrypted[e.id] || await decryptPassword(e.encrypted_password, e.iv, masterPassword);
          return { service: e.service_name, username: e.username, password: plain, notes: e.notes };
        })
      );
      const encrypted = await encryptVaultExport(JSON.stringify(plainEntries), masterPassword);
      const blob = new Blob([encrypted], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'vault-export.json.enc'; a.click();
      URL.revokeObjectURL(url);
      await logAudit('vault_export');
      toast.success('Vault exported');
    } catch {
      toast.error('Export failed');
    }
  };

  const importVault = async (file: File) => {
    if (!user || !masterPassword) return;
    try {
      const content = await file.text();
      const decryptedData = await decryptVaultImport(content, masterPassword);
      const items = JSON.parse(decryptedData) as Array<{ service: string; username: string; password: string; notes?: string }>;
      for (const item of items) {
        const { encrypted, iv } = await encryptPassword(item.password, masterPassword);
        await supabase.from('vault_passwords').insert({
          user_id: user.id,
          service_name: item.service,
          username: item.username,
          encrypted_password: encrypted,
          iv,
          notes: item.notes || null,
        });
      }
      await logAudit('vault_import', { count: items.length });
      toast.success(`Imported ${items.length} entries`);
      fetchEntries();
    } catch {
      toast.error('Import failed. Check file and password.');
    }
  };

  const filtered = entries.filter(e =>
    e.service_name.toLowerCase().includes(search.toLowerCase()) ||
    e.username.toLowerCase().includes(search.toLowerCase())
  );

  if (!masterUnlocked) {
    return (
      <AppLayout>
        <div className="max-w-md mx-auto mt-20 animate-slide-in">
          <Card>
            <CardHeader className="text-center">
              <Lock className="h-10 w-10 mx-auto text-primary mb-2" />
              <CardTitle>Unlock Your Vault</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">Enter your master password to decrypt stored passwords</p>
              <Input
                type="password"
                placeholder="Master password..."
                value={masterPassword}
                onChange={e => setMasterPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && unlockMaster()}
              />
              <Button onClick={unlockMaster} className="w-full">Unlock Vault</Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold">Password Vault</h1>
          <div className="flex gap-2 flex-wrap">
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1"><Plus className="h-4 w-4" /> Add</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Password</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Service</Label><Input placeholder="Gmail, GitHub..." value={newService} onChange={e => setNewService(e.target.value)} /></div>
                  <div><Label>Username / Email</Label><Input placeholder="user@example.com" value={newUsername} onChange={e => setNewUsername(e.target.value)} /></div>
                  <div><Label>Password</Label><Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} /></div>
                  <div><Label>Notes (optional)</Label><Input value={newNotes} onChange={e => setNewNotes(e.target.value)} /></div>
                  <Button onClick={addEntry} disabled={saving || !newService || !newPassword} className="w-full">
                    {saving ? 'Encrypting...' : 'Save Securely'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="secondary" size="sm" onClick={exportVault} className="gap-1"><Download className="h-4 w-4" /> Export</Button>
            <Button variant="secondary" size="sm" className="gap-1" onClick={() => document.getElementById('import-file')?.click()}>
              <Upload className="h-4 w-4" /> Import
            </Button>
            <input id="import-file" type="file" accept=".enc" className="hidden" onChange={e => e.target.files?.[0] && importVault(e.target.files[0])} />
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search vault..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {filtered.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-muted-foreground">No passwords stored yet. Add your first one!</CardContent></Card>
        ) : (
          <div className="space-y-3">
            {filtered.map(entry => (
              <Card key={entry.id} className="animate-slide-in">
                <CardContent className="py-4 flex items-center gap-4">
                  <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Lock className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{entry.service_name}</div>
                    <div className="text-sm text-muted-foreground truncate">{entry.username}</div>
                    {showPassword[entry.id] && decrypted[entry.id] && (
                      <code className="text-xs font-mono text-accent mt-1 block">{decrypted[entry.id]}</code>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => revealPassword(entry)}>
                      {showPassword[entry.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => { if (decrypted[entry.id]) { navigator.clipboard.writeText(decrypted[entry.id]); toast.success('Copied!'); } else { revealPassword(entry).then(() => toast.info('Reveal first, then copy')); } }}>
                      <Lock className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteEntry(entry.id, entry.service_name)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
