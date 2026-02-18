// Zero-knowledge crypto utilities
// AES-256-GCM encryption using Web Crypto API (available in React Native via polyfill/Hermes)
// Key derivation: PBKDF2 with SHA-256

const PBKDF2_ITERATIONS = 310_000; // OWASP recommended minimum for SHA-256
const KEY_LENGTH = 256;
const SALT_LENGTH = 32;

function bufToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBuf(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, 2), 16);
  }
  return bytes;
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function generateSalt(): string {
  const bytes = new Uint8Array(SALT_LENGTH);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

export function generateIV(): string {
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  return bytesToHex(iv);
}

export function generateRecoveryKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  // Format as XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX
  const hex = bytesToHex(bytes);
  return hex.match(/.{8}/g)!.join('-').toUpperCase();
}

export async function deriveKey(masterPassword: string, saltHex: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(masterPassword),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  const saltBytes = hexToBytes(saltHex);

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBytes.buffer as ArrayBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptData(plaintext: string, key: CryptoKey): Promise<{ ciphertext: string; iv: string }> {
  const encoder = new TextEncoder();
  const ivBytes = new Uint8Array(12);
  crypto.getRandomValues(ivBytes);

    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: ivBytes.buffer as ArrayBuffer },
    key,
    encoder.encode(plaintext)
  );

  return {
    ciphertext: bytesToHex(new Uint8Array(encrypted)),
    iv: bytesToHex(ivBytes),
  };
}

export async function decryptData(ciphertextHex: string, ivHex: string, key: CryptoKey): Promise<string> {
  const decoder = new TextDecoder();
  const cipherBytes = hexToBytes(ciphertextHex);
  const ivBytes = hexToBytes(ivHex);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivBytes.buffer as ArrayBuffer },
      key,
      cipherBytes.buffer as ArrayBuffer
    );

  return decoder.decode(decrypted);
}

export async function hashRecoveryKey(recoveryKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const hash = await crypto.subtle.digest('SHA-256', encoder.encode(recoveryKey));
  return bytesToHex(new Uint8Array(hash));
}

export function generatePassword(options: {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
}): string {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const nums = '0123456789';
  const syms = '!@#$%^&*()_+-=[]{}|;:,.<>?';

  let chars = '';
  let required = '';

  if (options.uppercase) { chars += upper; required += upper[Math.floor(Math.random() * upper.length)]; }
  if (options.lowercase) { chars += lower; required += lower[Math.floor(Math.random() * lower.length)]; }
  if (options.numbers) { chars += nums; required += nums[Math.floor(Math.random() * nums.length)]; }
  if (options.symbols) { chars += syms; required += syms[Math.floor(Math.random() * syms.length)]; }

  if (!chars) chars = lower + nums;

  const randomBytes = new Uint8Array(options.length);
  crypto.getRandomValues(randomBytes);

  let password = required;
  for (let i = required.length; i < options.length; i++) {
    password += chars[randomBytes[i] % chars.length];
  }

  // Shuffle
  return password
    .split('')
    .sort(() => {
      const b = new Uint8Array(1);
      crypto.getRandomValues(b);
      return b[0] - 128;
    })
    .join('');
}

export function getPasswordStrength(password: string): {
  score: number; // 0-4
  label: string;
  color: string;
} {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (password.length >= 16) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const capped = Math.min(4, Math.floor(score * 4 / 6));

  const labels = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981'];

  return {
    score: capped,
    label: labels[capped],
    color: colors[capped],
  };
}
