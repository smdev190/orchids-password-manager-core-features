import { create } from 'zustand';
import { VaultEntry, UserProfile, AuthSession, VaultEntryData, Category } from './types';
import { deriveKey, encryptData, decryptData, generateSalt } from './crypto';
import { saveSession, getSession, saveUserProfile, getUserProfile, clearAll, setLastSync, getLastSync } from './storage';
import { authJson, authFetch } from './authFetch';
import { BACKEND_URL } from './api';

interface VaultStore {
  // Auth state
  user: UserProfile | null;
  session: AuthSession | null;
  isAuthenticated: boolean;

  // Vault key (in-memory only, cleared on lock)
  vaultKey: CryptoKey | null;
  isUnlocked: boolean;
  lastActivity: number;

  // Vault data
  entries: VaultEntry[];
  categories: Category[];
  isLoading: boolean;
  syncStatus: 'idle' | 'syncing' | 'error';

  // Actions
  register: (email: string, password: string, masterPassword: string) => Promise<{ recoveryKey: string }>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  unlock: (masterPassword: string) => Promise<boolean>;
  lock: () => void;
  updateActivity: () => void;

  loadEntries: () => Promise<void>;
  addEntry: (data: VaultEntryData, categoryId?: string) => Promise<VaultEntry>;
  updateEntry: (id: string, data: VaultEntryData, categoryId?: string) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  decryptEntry: (entry: VaultEntry) => Promise<VaultEntryData>;

  loadCategories: () => Promise<void>;

  syncVault: () => Promise<void>;

  hydrate: () => Promise<void>;
}

export const useVaultStore = create<VaultStore>((set, get) => ({
  user: null,
  session: null,
  isAuthenticated: false,
  vaultKey: null,
  isUnlocked: false,
  lastActivity: Date.now(),
  entries: [],
  categories: [],
  isLoading: false,
  syncStatus: 'idle',

  hydrate: async () => {
    const [session, user] = await Promise.all([getSession(), getUserProfile()]);
    if (session && user) {
      set({ session, user, isAuthenticated: true });
    }
  },

  register: async (email, password, masterPassword) => {
    const salt = generateSalt();

    const { generateRecoveryKey, hashRecoveryKey } = await import('./crypto');
    const recoveryKey = generateRecoveryKey();
    const recoveryKeyHash = await hashRecoveryKey(recoveryKey);

    const res = await fetch(`${BACKEND_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
      body: JSON.stringify({
        email,
        password,
        master_salt: salt,
        recovery_key_hash: recoveryKeyHash,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Registration failed' }));
      throw new Error(err.error ?? 'Registration failed');
    }

    const data = await res.json();
    const userProfile: UserProfile = {
      id: data.user.id,
      email: data.user.email,
      master_salt: salt,
      biometric_enabled: false,
      auto_lock_minutes: 5,
    };

    await saveSession(data.session);
    await saveUserProfile(userProfile);

    const key = await deriveKey(masterPassword, salt);

    set({
      user: userProfile,
      session: data.session,
      isAuthenticated: true,
      vaultKey: key,
      isUnlocked: true,
      lastActivity: Date.now(),
    });

    return { recoveryKey };
  },

  login: async (email, password) => {
    const res = await fetch(`${BACKEND_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Login failed' }));
      throw new Error(err.error ?? 'Login failed');
    }

    const data = await res.json();
    const userProfile: UserProfile = {
      id: data.user.id,
      email: data.user.email,
      master_salt: data.user.master_salt,
      biometric_enabled: data.user.biometric_enabled,
      auto_lock_minutes: data.user.auto_lock_minutes,
    };

    await saveSession(data.session);
    await saveUserProfile(userProfile);

    set({
      user: userProfile,
      session: data.session,
      isAuthenticated: true,
      isUnlocked: false, // Still need master password to unlock
    });
  },

  unlock: async (masterPassword) => {
    const user = get().user;
    if (!user) return false;

    try {
      const key = await deriveKey(masterPassword, user.master_salt);
      set({ vaultKey: key, isUnlocked: true, lastActivity: Date.now() });
      return true;
    } catch {
      return false;
    }
  },

  lock: () => {
    set({ vaultKey: null, isUnlocked: false, entries: [] });
  },

  logout: async () => {
    const { session } = get();
    if (session) {
      try {
        await fetch(`${BACKEND_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true',
            Authorization: `Bearer ${session.access_token}`,
          },
        });
      } catch {}
    }
    await clearAll();
    set({ user: null, session: null, isAuthenticated: false, isUnlocked: false, vaultKey: null, entries: [], categories: [] });
  },

  updateActivity: () => {
    set({ lastActivity: Date.now() });
  },

  loadEntries: async () => {
    const { vaultKey } = get();
    if (!vaultKey) return;

    set({ isLoading: true });
    try {
      const data = await authJson<{ entries: VaultEntry[] }>('/vault');
      // Filter out soft-deleted
      const active = (data.entries ?? []).filter((e) => !e.deleted_at);
      set({ entries: active });
    } catch (e) {
      console.error('loadEntries error:', e);
    } finally {
      set({ isLoading: false });
    }
  },

  addEntry: async (entryData, categoryId) => {
    const { vaultKey } = get();
    if (!vaultKey) throw new Error('Vault locked');

    const plaintext = JSON.stringify(entryData);
    const { ciphertext, iv } = await encryptData(plaintext, vaultKey);

    const response = await authJson<{ entry: VaultEntry }>('/vault', {
      method: 'POST',
      body: JSON.stringify({
        encrypted_data: ciphertext,
        iv,
        entry_type: entryData.type,
        title_hint: entryData.title,
        category_id: categoryId ?? null,
      }),
    });

    const newEntry = { ...response.entry, decrypted: entryData };
    set((s) => ({ entries: [newEntry, ...s.entries] }));
    return newEntry;
  },

  updateEntry: async (id, entryData, categoryId) => {
    const { vaultKey } = get();
    if (!vaultKey) throw new Error('Vault locked');

    const plaintext = JSON.stringify(entryData);
    const { ciphertext, iv } = await encryptData(plaintext, vaultKey);

    const response = await authJson<{ entry: VaultEntry }>(`/vault/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        encrypted_data: ciphertext,
        iv,
        entry_type: entryData.type,
        title_hint: entryData.title,
        category_id: categoryId ?? null,
      }),
    });

    const updated = { ...response.entry, decrypted: entryData };
    set((s) => ({
      entries: s.entries.map((e) => (e.id === id ? updated : e)),
    }));
  },

  deleteEntry: async (id) => {
    await authFetch(`/vault/${id}`, { method: 'DELETE' });
    set((s) => ({ entries: s.entries.filter((e) => e.id !== id) }));
  },

  decryptEntry: async (entry) => {
    const { vaultKey } = get();
    if (!vaultKey) throw new Error('Vault locked');
    if (entry.decrypted) return entry.decrypted;

    const plaintext = await decryptData(entry.encrypted_data, entry.iv, vaultKey);
    return JSON.parse(plaintext) as VaultEntryData;
  },

  loadCategories: async () => {
    try {
      const data = await authJson<{ categories: Category[] }>('/vault/categories');
      set({ categories: data.categories ?? [] });
    } catch {}
  },

  syncVault: async () => {
    const { entries, vaultKey } = get();
    if (!vaultKey) return;

    set({ syncStatus: 'syncing' });
    try {
      const lastSync = await getLastSync();
      const localEntries = entries.map((e) => ({
        id: e.id,
        encrypted_data: e.encrypted_data,
        iv: e.iv,
        entry_type: e.entry_type,
        title_hint: e.title_hint,
        category_id: e.category_id,
        updated_at: e.updated_at,
      }));

      const data = await authJson<{ upserted: VaultEntry[]; server_changes: VaultEntry[]; server_time: string }>(
        '/vault/sync',
        {
          method: 'POST',
          body: JSON.stringify({ entries: localEntries, last_sync: lastSync }),
        }
      );

      await setLastSync(data.server_time);

      // Merge server changes
      set((s) => {
        const map = new Map(s.entries.map((e) => [e.id, e]));
        for (const e of data.server_changes ?? []) {
          if (!e.deleted_at) map.set(e.id, e);
          else map.delete(e.id);
        }
        for (const e of data.upserted ?? []) {
          if (!e.deleted_at) map.set(e.id, e);
        }
        return { entries: Array.from(map.values()) };
      });

      set({ syncStatus: 'idle' });
    } catch (e) {
      set({ syncStatus: 'error' });
    }
  },
}));
