import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Switch,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  FingerprintIcon,
  LockIcon,
  MoonIcon,
  SunIcon,
  TrashIcon,
  ShieldCheckIcon,
  LogOutIcon,
  ChevronRightIcon,
} from 'lucide-react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { useColorScheme } from 'nativewind';
import { useVaultStore } from '@/lib/store';
import { saveBiometricKey, clearBiometricKey, clearAll } from '@/lib/storage';
import { authJson } from '@/lib/authFetch';

export default function SettingsScreen() {
  const router = useRouter();
  const { colorScheme, toggleColorScheme } = useColorScheme();
  const { user, lock, isUnlocked, updateActivity } = useVaultStore((s) => ({
    user: s.user,
    lock: s.lock,
    isUnlocked: s.isUnlocked,
    updateActivity: s.updateActivity,
  }));

  const [biometricEnabled, setBiometricEnabled] = useState(user?.biometric_enabled ?? false);
  const [autoLockMinutes, setAutoLockMinutes] = useState(user?.auto_lock_minutes ?? 5);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [savingBio, setSavingBio] = useState(false);

  useEffect(() => {
    checkBiometricAvailability();
  }, []);

  const checkBiometricAvailability = async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    setBiometricAvailable(hasHardware && isEnrolled);
  };

  const handleToggleBiometric = async (value: boolean) => {
    if (!isUnlocked) {
      Alert.alert('Vault Locked', 'Unlock your vault first to change biometric settings.');
      return;
    }

    setSavingBio(true);
    try {
      if (value) {
        // Authenticate first
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Enable Biometric Unlock',
          cancelLabel: 'Cancel',
        });

        if (!result.success) {
          setSavingBio(false);
          return;
        }

        // Store master password (already in memory) wrapped with biometric key
        // We store a reference - the actual key derivation happens on unlock
        // For demo: we store the fact that biometric is enabled
        // In production: use Android Keystore to wrap the derived key
        Alert.alert(
          'Biometric Setup',
          'Enter your master password to link biometric unlock.',
          [
            { text: 'Cancel', style: 'cancel', onPress: () => setSavingBio(false) },
            {
              text: 'Confirm',
              onPress: async () => {
                await saveBiometricKey('bio_enabled_placeholder');
                await authJson('/auth/profile', {
                  method: 'PATCH',
                  body: JSON.stringify({ biometric_enabled: true }),
                });
                setBiometricEnabled(true);
                useVaultStore.setState((s) => ({
                  user: s.user ? { ...s.user, biometric_enabled: true } : s.user,
                }));
                setSavingBio(false);
              },
            },
          ]
        );
      } else {
        await clearBiometricKey();
        await authJson('/auth/profile', {
          method: 'PATCH',
          body: JSON.stringify({ biometric_enabled: false }),
        });
        setBiometricEnabled(false);
        useVaultStore.setState((s) => ({
          user: s.user ? { ...s.user, biometric_enabled: false } : s.user,
        }));
        setSavingBio(false);
      }
    } catch (e) {
      setSavingBio(false);
    }
  };

  const handleAutoLockChange = async (minutes: number) => {
    setAutoLockMinutes(minutes);
    updateActivity();
    try {
      await authJson('/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify({ auto_lock_minutes: minutes }),
      });
      useVaultStore.setState((s) => ({
        user: s.user ? { ...s.user, auto_lock_minutes: minutes } : s.user,
      }));
    } catch {}
  };

  const handleLockNow = () => {
    lock();
    router.replace('/unlock');
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'You will be signed out. Your encrypted data is safe.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await clearAll();
          useVaultStore.setState({
            user: null,
            session: null,
            isAuthenticated: false,
            isUnlocked: false,
            entries: [],
            vaultKey: null,
          });
          router.replace('/login');
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all vault data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Forever',
          style: 'destructive',
          onPress: () => Alert.alert('Info', 'Please contact support to delete your account.'),
        },
      ]
    );
  };

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ padding: 20 }}>
      <View className="pb-4 pt-12">
        <Text className="text-2xl font-bold text-foreground">Settings</Text>
        {user && <Text className="mt-1 text-sm text-muted-foreground">{user.email}</Text>}
      </View>

      {/* Security */}
      <SectionHeader title="Security" />
      <View className="mb-4 overflow-hidden rounded-2xl border border-border bg-card">
        {/* Biometric */}
        {biometricAvailable && (
          <>
            <View className="flex-row items-center justify-between p-4">
              <View className="flex-row items-center gap-3">
                <FingerprintIcon size={20} color="#6366f1" />
                <View>
                  <Text className="font-medium text-foreground">Biometric Unlock</Text>
                  <Text className="text-xs text-muted-foreground">Fingerprint / Face ID</Text>
                </View>
              </View>
              {savingBio ? (
                <ActivityIndicator size="small" color="#6366f1" />
              ) : (
                <Switch
                  value={biometricEnabled}
                  onValueChange={handleToggleBiometric}
                  trackColor={{ false: '#3f3f46', true: '#6366f1' }}
                  thumbColor="white"
                />
              )}
            </View>
            <View className="h-px bg-border" />
          </>
        )}

        {/* Auto-lock */}
        <View className="p-4">
          <View className="flex-row items-center gap-3 mb-3">
            <LockIcon size={20} color="#6366f1" />
            <View>
              <Text className="font-medium text-foreground">Auto-Lock</Text>
              <Text className="text-xs text-muted-foreground">Lock after inactivity</Text>
            </View>
          </View>
          <View className="flex-row gap-2 flex-wrap">
            {[1, 2, 5, 10, 15, 30].map((m) => (
              <TouchableOpacity
                key={m}
                onPress={() => handleAutoLockChange(m)}
                className={`rounded-lg px-3 py-1.5 ${autoLockMinutes === m ? 'bg-primary' : 'bg-secondary'}`}
              >
                <Text className={`text-xs font-semibold ${autoLockMinutes === m ? 'text-primary-foreground' : 'text-muted-foreground'}`}>
                  {m}m
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View className="h-px bg-border" />

        {/* Lock now */}
        <TouchableOpacity onPress={handleLockNow} className="flex-row items-center justify-between p-4">
          <View className="flex-row items-center gap-3">
            <ShieldCheckIcon size={20} color="#f59e0b" />
            <Text className="font-medium text-foreground">Lock Vault Now</Text>
          </View>
          <ChevronRightIcon size={16} color="#888" />
        </TouchableOpacity>
      </View>

      {/* Appearance */}
      <SectionHeader title="Appearance" />
      <View className="mb-4 overflow-hidden rounded-2xl border border-border bg-card">
        <View className="flex-row items-center justify-between p-4">
          <View className="flex-row items-center gap-3">
            {colorScheme === 'dark' ? <MoonIcon size={20} color="#6366f1" /> : <SunIcon size={20} color="#f59e0b" />}
            <Text className="font-medium text-foreground">Dark Mode</Text>
          </View>
          <Switch
            value={colorScheme === 'dark'}
            onValueChange={toggleColorScheme}
            trackColor={{ false: '#3f3f46', true: '#6366f1' }}
            thumbColor="white"
          />
        </View>
      </View>

      {/* About */}
      <SectionHeader title="About" />
      <View className="mb-4 overflow-hidden rounded-2xl border border-border bg-card p-4 gap-2">
        <Row label="Version" value="1.0.0" />
        <View className="h-px bg-border" />
        <Row label="Encryption" value="AES-256-GCM" />
        <View className="h-px bg-border" />
        <Row label="Key Derivation" value="PBKDF2-SHA256" />
        <View className="h-px bg-border" />
        <Row label="Architecture" value="Zero-Knowledge" />
      </View>

      {/* Account */}
      <SectionHeader title="Account" />
      <View className="mb-8 overflow-hidden rounded-2xl border border-border bg-card">
        <TouchableOpacity onPress={handleSignOut} className="flex-row items-center gap-3 p-4">
          <LogOutIcon size={20} color="#888" />
          <Text className="font-medium text-foreground">Sign Out</Text>
        </TouchableOpacity>
        <View className="h-px bg-border" />
        <TouchableOpacity onPress={handleDeleteAccount} className="flex-row items-center gap-3 p-4">
          <TrashIcon size={20} color="#ef4444" />
          <Text className="font-medium text-destructive">Delete Account</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <Text className="mb-2 ml-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">{title}</Text>;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="text-sm text-muted-foreground">{label}</Text>
      <Text className="text-sm font-medium text-foreground">{value}</Text>
    </View>
  );
}
