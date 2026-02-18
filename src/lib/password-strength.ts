// Password strength checker with entropy, patterns, and dictionary detection

const COMMON_PASSWORDS = [
  'password', '123456', '12345678', 'qwerty', 'abc123', 'monkey', 'master',
  'dragon', '111111', 'baseball', 'iloveyou', 'trustno1', 'sunshine', 'princess',
  'football', 'shadow', 'superman', 'michael', 'login', 'welcome', 'admin',
  'letmein', 'starwars', 'hello', 'charlie', 'donald', 'password1', '1234567',
  'access', '123123', '696969', 'mustang', 'passw0rd', 'qwerty123',
];

export type StrengthLevel = 'weak' | 'medium' | 'strong' | 'very-strong';

export interface StrengthResult {
  score: number; // 0-100
  level: StrengthLevel;
  label: string;
  entropy: number;
  feedback: string[];
  metadata: {
    length: number;
    hasUpper: boolean;
    hasLower: boolean;
    hasDigit: boolean;
    hasSymbol: boolean;
    hasRepeats: boolean;
    isCommon: boolean;
    patternType: string;
    charDiversity: number;
  };
}

function calculateEntropy(password: string): number {
  let charsetSize = 0;
  if (/[a-z]/.test(password)) charsetSize += 26;
  if (/[A-Z]/.test(password)) charsetSize += 26;
  if (/[0-9]/.test(password)) charsetSize += 10;
  if (/[^a-zA-Z0-9]/.test(password)) charsetSize += 33;
  if (charsetSize === 0) return 0;
  return password.length * Math.log2(charsetSize);
}

function hasRepeatingPatterns(password: string): boolean {
  // Check for 3+ repeated chars
  if (/(.)\1{2,}/.test(password)) return true;
  // Check for sequential patterns
  for (let i = 0; i < password.length - 2; i++) {
    const a = password.charCodeAt(i);
    const b = password.charCodeAt(i + 1);
    const c = password.charCodeAt(i + 2);
    if (b - a === 1 && c - b === 1) return true;
    if (a - b === 1 && b - c === 1) return true;
  }
  return false;
}

function detectPatternType(password: string): string {
  if (/^[a-zA-Z]+$/.test(password)) return 'letters-only';
  if (/^[0-9]+$/.test(password)) return 'digits-only';
  if (/^[a-zA-Z]+[0-9]+$/.test(password)) return 'word+numbers';
  if (/^[A-Z][a-z]+[0-9]+$/.test(password)) return 'capitalized+numbers';
  if (hasRepeatingPatterns(password)) return 'repeating-pattern';
  return 'mixed';
}

export function checkPasswordStrength(password: string): StrengthResult {
  if (!password) {
    return {
      score: 0, level: 'weak', label: 'No Password', entropy: 0, feedback: ['Enter a password'],
      metadata: { length: 0, hasUpper: false, hasLower: false, hasDigit: false, hasSymbol: false, hasRepeats: false, isCommon: false, patternType: 'none', charDiversity: 0 },
    };
  }

  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSymbol = /[^a-zA-Z0-9]/.test(password);
  const hasRepeats = hasRepeatingPatterns(password);
  const isCommon = COMMON_PASSWORDS.includes(password.toLowerCase());
  const patternType = detectPatternType(password);
  const entropy = calculateEntropy(password);
  const charDiversity = new Set(password).size;

  let score = 0;
  const feedback: string[] = [];

  // Length scoring (max 30)
  score += Math.min(30, password.length * 2);
  if (password.length < 8) feedback.push('Use at least 8 characters');
  if (password.length < 12) feedback.push('Consider using 12+ characters for better security');

  // Character diversity (max 25)
  if (hasUpper) score += 6; else feedback.push('Add uppercase letters');
  if (hasLower) score += 6; else feedback.push('Add lowercase letters');
  if (hasDigit) score += 6; else feedback.push('Add numbers');
  if (hasSymbol) score += 7; else feedback.push('Add special symbols');

  // Entropy bonus (max 25)
  score += Math.min(25, Math.floor(entropy / 3));

  // Unique chars bonus (max 10)
  score += Math.min(10, Math.floor((charDiversity / password.length) * 10));

  // Penalties
  if (isCommon) { score = Math.min(score, 10); feedback.unshift('This is a commonly used password'); }
  if (hasRepeats) { score -= 15; feedback.push('Avoid repeating or sequential patterns'); }
  if (patternType === 'word+numbers') { score -= 5; feedback.push('Avoid simple word+number patterns'); }

  score = Math.max(0, Math.min(100, score));

  let level: StrengthLevel;
  let label: string;
  if (score < 30) { level = 'weak'; label = 'Weak'; }
  else if (score < 55) { level = 'medium'; label = 'Medium'; }
  else if (score < 80) { level = 'strong'; label = 'Strong'; }
  else { level = 'very-strong'; label = 'Very Strong'; }

  return {
    score, level, label, entropy: Math.round(entropy * 10) / 10, feedback,
    metadata: { length: password.length, hasUpper, hasLower, hasDigit, hasSymbol, hasRepeats, isCommon, patternType, charDiversity },
  };
}
