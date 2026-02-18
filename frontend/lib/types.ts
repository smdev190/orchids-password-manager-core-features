// Vault entry types
export type EntryType = 'login' | 'note' | 'card' | 'wifi' | 'identity';

export interface LoginEntry {
  type: 'login';
  title: string;
  username: string;
  password: string;
  url?: string;
  notes?: string;
}

export interface NoteEntry {
  type: 'note';
  title: string;
  content: string;
}

export interface CardEntry {
  type: 'card';
  title: string;
  cardNumber: string;
  cardHolder: string;
  expiryDate: string;
  cvv: string;
  notes?: string;
}

export interface WifiEntry {
  type: 'wifi';
  title: string;
  ssid: string;
  password: string;
  securityType: string;
}

export interface IdentityEntry {
  type: 'identity';
  title: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
}

export type VaultEntryData = LoginEntry | NoteEntry | CardEntry | WifiEntry | IdentityEntry;

export interface VaultEntry {
  id: string;
  user_id?: string;
  category_id?: string | null;
  encrypted_data: string;
  iv: string;
  entry_type: EntryType;
  title_hint: string | null;
  favicon_url?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  // Decrypted (local only, never sent to server)
  decrypted?: VaultEntryData;
}

export interface Category {
  id: string;
  user_id?: string;
  name: string;
  icon: string;
  color: string;
  created_at?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  master_salt: string;
  biometric_enabled: boolean;
  auto_lock_minutes: number;
}

export interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}
