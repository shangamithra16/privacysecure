// AES-256-GCM encryption using Web Crypto API

const SALT_LENGTH = 16;
const IV_LENGTH = 12;

async function deriveKey(masterPassword: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(masterPassword).buffer as ArrayBuffer,
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt.buffer as ArrayBuffer, iterations: 310000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptPassword(plaintext: string, masterPassword: string): Promise<{ encrypted: string; iv: string }> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const key = await deriveKey(masterPassword, salt);
  const encoder = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(plaintext)
  );
  // Combine salt + ciphertext
  const combined = new Uint8Array(SALT_LENGTH + ciphertext.byteLength);
  combined.set(salt, 0);
  combined.set(new Uint8Array(ciphertext), SALT_LENGTH);
  return {
    encrypted: btoa(String.fromCharCode(...combined)),
    iv: btoa(String.fromCharCode(...iv)),
  };
}

export async function decryptPassword(encryptedB64: string, ivB64: string, masterPassword: string): Promise<string> {
  const combined = Uint8Array.from(atob(encryptedB64), c => c.charCodeAt(0));
  const iv = Uint8Array.from(atob(ivB64), c => c.charCodeAt(0));
  const salt = combined.slice(0, SALT_LENGTH);
  const ciphertext = combined.slice(SALT_LENGTH);
  const key = await deriveKey(masterPassword, salt);
  const plainBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );
  return new TextDecoder().decode(plainBuffer);
}

export async function encryptVaultExport(data: string, password: string): Promise<string> {
  const { encrypted, iv } = await encryptPassword(data, password);
  return JSON.stringify({ encrypted, iv, version: 1 });
}

export async function decryptVaultImport(fileContent: string, password: string): Promise<string> {
  const { encrypted, iv } = JSON.parse(fileContent);
  return decryptPassword(encrypted, iv, password);
}
