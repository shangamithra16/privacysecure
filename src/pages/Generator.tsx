import { useState, useCallback } from 'react';
import { generatePassword, DEFAULT_OPTIONS, GeneratorOptions } from '@/lib/password-generator';
import { checkPasswordStrength, StrengthResult } from '@/lib/password-strength';
import StrengthMeter from '@/components/StrengthMeter';
import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Copy, RefreshCw, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export default function Generator() {
  const { logAudit } = useAuth();
  const [options, setOptions] = useState<GeneratorOptions>(DEFAULT_OPTIONS);
  const [password, setPassword] = useState('');
  const [strength, setStrength] = useState<StrengthResult | null>(null);
  const [customPassword, setCustomPassword] = useState('');
  const [customStrength, setCustomStrength] = useState<StrengthResult | null>(null);
  const [aiTips, setAiTips] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const generate = useCallback(() => {
    const pw = generatePassword(options);
    setPassword(pw);
    setStrength(checkPasswordStrength(pw));
    logAudit('password_generated', { length: options.length });
  }, [options, logAudit]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(password);
    toast.success('Password copied!');
  };

  const checkCustom = (val: string) => {
    setCustomPassword(val);
    setCustomStrength(val ? checkPasswordStrength(val) : null);
  };

  const getAiTips = async () => {
    const result = customStrength || strength;
    if (!result) { toast.error('Generate or enter a password first'); return; }

    setAiLoading(true);
    setAiTips('');
    try {
      const response = await supabase.functions.invoke('ai-advisor', {
        body: { metadata: result.metadata, score: result.score, entropy: result.entropy, level: result.level },
      });
      if (response.error) throw response.error;
      setAiTips(response.data?.advice || 'No advice available.');
    } catch {
      toast.error('Failed to get AI advice');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">Password Generator</h1>

        <Card>
          <CardHeader><CardTitle>Generate Secure Password</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            {/* Length slider */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Length</Label>
                <span className="text-sm font-mono text-muted-foreground">{options.length}</span>
              </div>
              <Slider
                value={[options.length]}
                onValueChange={([v]) => setOptions(o => ({ ...o, length: v }))}
                min={8} max={64} step={1}
              />
            </div>

            {/* Toggle options */}
            {([
              ['uppercase', 'Uppercase (A-Z)'],
              ['lowercase', 'Lowercase (a-z)'],
              ['digits', 'Digits (0-9)'],
              ['symbols', 'Symbols (!@#$%)'],
              ['avoidAmbiguous', 'Avoid ambiguous (O/0, l/1)'],
            ] as const).map(([key, label]) => (
              <div key={key} className="flex items-center justify-between">
                <Label>{label}</Label>
                <Switch
                  checked={options[key]}
                  onCheckedChange={v => setOptions(o => ({ ...o, [key]: v }))}
                />
              </div>
            ))}

            <Button onClick={generate} className="w-full gap-2">
              <RefreshCw className="h-4 w-4" /> Generate Password
            </Button>

            {password && (
              <div className="space-y-3 animate-slide-in">
                <div className="flex items-center gap-2 p-3 bg-secondary rounded-lg">
                  <code className="flex-1 text-sm font-mono break-all select-all">{password}</code>
                  <Button variant="ghost" size="sm" onClick={copyToClipboard}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                {strength && <StrengthMeter result={strength} />}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Check Your Password</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="password"
              placeholder="Enter a password to check..."
              value={customPassword}
              onChange={e => checkCustom(e.target.value)}
            />
            {customStrength && <StrengthMeter result={customStrength} />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> AI Security Advisor</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Get AI-powered security recommendations. Your password is never sent to the AI — only metadata like length, entropy, and pattern type.</p>
            <Button onClick={getAiTips} disabled={aiLoading} variant="secondary" className="gap-2">
              {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Get AI Recommendations
            </Button>
            {aiTips && (
              <div className="p-3 bg-secondary rounded-lg text-sm whitespace-pre-wrap animate-slide-in">{aiTips}</div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
