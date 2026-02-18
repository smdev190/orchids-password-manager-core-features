import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthSession, UserProfile } from './types';

const KEYS = {
  SESSION: 'vaultguard_session',
  USER_PROFILE: 'vaultguard_user',
  BIOMETRIC_KEY: 'vaultguard_bio_key',
  LAST_SYNC: 'vaultguard_last_sync',
  ONBOARDED: 'vaultguard_onboarded',
  AUTO_LOCK_ENABLED: 'vaultguard_autolock',
};

// Secure storage (encrypted by OS keychain)
export async function saveSession(session: AuthSession): Promise<void> {
  await SecureStore.setItemAsync(KEYS.SESSION, JSON.stringify(session));
}

export async function getSession(): Promise<AuthSession | null> {
  try {
    const raw = await SecureStore.getItemAsync(KEYS.SESSION);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  await SecureStore.deleteItemAsync(KEYS.SESSION);
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  await SecureStore.setItemAsync(KEYS.USER_PROFILE, JSON.stringify(profile));
}

export async function getUserProfile(): Promise<UserProfile | null> {
  try {
    const raw = await SecureStore.getItemAsync(KEYS.USER_PROFILE);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function clearUserProfile(): Promise<void> {
  await SecureStore.deleteItemAsync(KEYS.USER_PROFILE);
}

// Store a wrapped key for biometric auth
export async function saveBiometricKey(wrappedKey: string): Promise<void> {
  await SecureStore.setItemAsync(KEYS.BIOMETRIC_KEY, wrappedKey, {
    requireAuthentication: true,
  });
}

export async function getBiometricKey(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(KEYS.BIOMETRIC_KEY, {
      requireAuthentication: true,
    });
  } catch {
    return null;
  }
}

export async function clearBiometricKey(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(KEYS.BIOMETRIC_KEY);
  } catch {}
}

// AsyncStorage for non-sensitive config
export async function setOnboarded(value: boolean): Promise<void> {
  await AsyncStorage.setItem(KEYS.ONBOARDED, value ? '1' : '0');
}

export async function isOnboarded(): Promise<boolean> {
  const val = await AsyncStorage.getItem(KEYS.ONBOARDED);
  return val === '1';
}

export async function setLastSync(isoDate: string): Promise<void> {
  await AsyncStorage.setItem(KEYS.LAST_SYNC, isoDate);
}

export async function getLastSync(): Promise<string | null> {
  return AsyncStorage.getItem(KEYS.LAST_SYNC);
}

export async function clearAll(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(KEYS.SESSION),
    SecureStore.deleteItemAsync(KEYS.USER_PROFILE),
    SecureStore.deleteItemAsync(KEYS.BIOMETRIC_KEY).catch(() => {}),
    AsyncStorage.multiRemove([KEYS.LAST_SYNC, KEYS.ONBOARDED, KEYS.AUTO_LOCK_ENABLED]),
  ]);
}
