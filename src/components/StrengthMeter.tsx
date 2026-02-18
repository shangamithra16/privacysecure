import { StrengthResult } from '@/lib/password-strength';

interface StrengthMeterProps {
  result: StrengthResult;
}

const levelColors: Record<string, string> = {
  'weak': 'bg-destructive',
  'medium': 'bg-warning',
  'strong': 'bg-success',
  'very-strong': 'bg-primary',
};

const levelTextColors: Record<string, string> = {
  'weak': 'text-destructive',
  'medium': 'text-warning',
  'strong': 'text-success',
  'very-strong': 'text-primary',
};

export default function StrengthMeter({ result }: StrengthMeterProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className={`font-semibold ${levelTextColors[result.level]}`}>{result.label}</span>
        <span className="text-muted-foreground font-mono">{result.score}/100</span>
      </div>
      <div className="h-2 rounded-full bg-secondary overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${levelColors[result.level]}`}
          style={{ width: `${result.score}%` }}
        />
      </div>
      <div className="text-xs text-muted-foreground">
        Entropy: {result.entropy} bits
      </div>
      {result.feedback.length > 0 && (
        <ul className="text-xs text-muted-foreground space-y-0.5 mt-1">
          {result.feedback.map((f, i) => (
            <li key={i} className="flex items-start gap-1">
              <span className="text-warning mt-0.5">•</span> {f}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
