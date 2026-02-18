import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ShieldCheckIcon, EyeIcon, EyeOffIcon, FingerprintIcon } from 'lucide-react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { useVaultStore } from '@/lib/store';
import { getBiometricKey } from '@/lib/storage';

export default function UnlockScreen() {
  const router = useRouter();
  const { user, unlock, login, isUnlocked } = useVaultStore((s) => ({
    user: s.user,
    unlock: s.unlock,
    login: s.login,
    isUnlocked: s.isUnlocked,
  }));

  const [masterPassword, setMasterPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  useEffect(() => {
    if (isUnlocked) {
      router.replace('/(tabs)/vault');
      return;
    }
    checkBiometrics();
  }, [isUnlocked]);

  const checkBiometrics = async () => {
    if (!user?.biometric_enabled) return;
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    if (hasHardware && isEnrolled) {
      setBiometricAvailable(true);
      // Auto-trigger biometric on open
      handleBiometric();
    }
  };

  const handleBiometric = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock VaultGuard',
        fallbackLabel: 'Use Master Password',
        cancelLabel: 'Cancel',
      });

      if (result.success) {
        const wrappedKey = await getBiometricKey();
        if (wrappedKey) {
          // The biometric key IS the master password stored securely
          const success = await unlock(wrappedKey);
          if (success) {
            router.replace('/(tabs)/vault');
          } else {
            Alert.alert('Biometric failed', 'Please use your master password.');
          }
        }
      }
    } catch (e) {
      console.log('Biometric error:', e);
    }
  };

  const handleUnlock = async () => {
    if (!masterPassword) {
      Alert.alert('Error', 'Please enter your master password.');
      return;
    }

    setLoading(true);
    try {
      const success = await unlock(masterPassword);
      if (success) {
        router.replace('/(tabs)/vault');
      } else {
        Alert.alert('Wrong Password', 'Incorrect master password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'You will be signed out. Your encrypted data remains safe.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          const { clearAll } = await import('@/lib/storage');
          await clearAll();
          useVaultStore.setState({ user: null, session: null, isAuthenticated: false, isUnlocked: false });
          router.replace('/login');
        },
      },
    ]);
  };

  return (
    <View className="flex-1 items-center justify-center bg-background px-6">
      <View className="w-full max-w-sm gap-8">
        {/* Header */}
        <View className="items-center gap-3">
          <View className="h-20 w-20 items-center justify-center rounded-3xl bg-primary">
            <ShieldCheckIcon size={40} color="white" />
          </View>
          <Text className="text-2xl font-bold text-foreground">Vault Locked</Text>
          {user && (
            <Text className="text-sm text-muted-foreground">{user.email}</Text>
          )}
        </View>

        {/* Master password input */}
        <View className="gap-4">
          <View className="gap-1.5">
            <Text className="text-sm font-medium text-foreground">Master Password</Text>
            <View className="flex-row items-center rounded-xl border border-border bg-secondary px-4">
              <TextInput
                className="flex-1 py-3.5 text-base text-foreground"
                value={masterPassword}
                onChangeText={setMasterPassword}
                placeholder="Enter master password"
                placeholderTextColor="#888"
                secureTextEntry={!showPassword}
                autoFocus
                onSubmitEditing={handleUnlock}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOffIcon size={18} color="#888" /> : <EyeIcon size={18} color="#888" />}
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            onPress={handleUnlock}
            disabled={loading}
            className="items-center rounded-2xl bg-primary py-4"
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-base font-semibold text-primary-foreground">Unlock Vault</Text>
            )}
          </TouchableOpacity>

          {biometricAvailable && (
            <TouchableOpacity
              onPress={handleBiometric}
              className="flex-row items-center justify-center gap-2 rounded-2xl border border-border py-3.5"
            >
              <FingerprintIcon size={22} color="#6366f1" />
              <Text className="text-base font-medium text-foreground">Use Biometrics</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity onPress={handleSignOut} className="items-center py-2">
          <Text className="text-sm text-muted-foreground">Sign out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
