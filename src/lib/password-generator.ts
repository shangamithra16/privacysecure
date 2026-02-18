// Cryptographically secure password generation using crypto.getRandomValues

export interface GeneratorOptions {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  digits: boolean;
  symbols: boolean;
  avoidAmbiguous: boolean;
}

const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const UPPERCASE_SAFE = 'ABCDEFGHJKMNPQRSTUVWXYZ'; // no I, L, O
const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const LOWERCASE_SAFE = 'abcdefghjkmnpqrstuvwxyz'; // no i, l, o
const DIGITS = '0123456789';
const DIGITS_SAFE = '23456789'; // no 0, 1
const SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?';

function secureRandom(max: number): number {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0] % max;
}

export function generatePassword(options: GeneratorOptions): string {
  const { length, uppercase, lowercase, digits, symbols, avoidAmbiguous } = options;

  let charset = '';
  const required: string[] = [];

  if (uppercase) {
    const set = avoidAmbiguous ? UPPERCASE_SAFE : UPPERCASE;
    charset += set;
    required.push(set[secureRandom(set.length)]);
  }
  if (lowercase) {
    const set = avoidAmbiguous ? LOWERCASE_SAFE : LOWERCASE;
    charset += set;
    required.push(set[secureRandom(set.length)]);
  }
  if (digits) {
    const set = avoidAmbiguous ? DIGITS_SAFE : DIGITS;
    charset += set;
    required.push(set[secureRandom(set.length)]);
  }
  if (symbols) {
    charset += SYMBOLS;
    required.push(SYMBOLS[secureRandom(SYMBOLS.length)]);
  }

  if (charset.length === 0) {
    charset = LOWERCASE + DIGITS;
    required.push(LOWERCASE[secureRandom(LOWERCASE.length)]);
    required.push(DIGITS[secureRandom(DIGITS.length)]);
  }

  const remaining = length - required.length;
  const chars = [...required];
  for (let i = 0; i < remaining; i++) {
    chars.push(charset[secureRandom(charset.length)]);
  }

  // Fisher-Yates shuffle
  for (let i = chars.length - 1; i > 0; i--) {
    const j = secureRandom(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join('');
}

export const DEFAULT_OPTIONS: GeneratorOptions = {
  length: 16,
  uppercase: true,
  lowercase: true,
  digits: true,
  symbols: true,
  avoidAmbiguous: false,
};
