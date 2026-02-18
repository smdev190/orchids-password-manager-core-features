import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ShieldCheckIcon, EyeIcon, EyeOffIcon, CheckCircleIcon, CopyIcon } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { useVaultStore } from '@/lib/store';
import { getPasswordStrength } from '@/lib/crypto';

export default function RegisterScreen() {
  const router = useRouter();
  const register = useVaultStore((s) => s.register);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [masterPassword, setMasterPassword] = useState('');
  const [confirmMaster, setConfirmMaster] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showMaster, setShowMaster] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recoveryKey, setRecoveryKey] = useState<string | null>(null);
  const [copiedRecovery, setCopiedRecovery] = useState(false);

  const masterStrength = getPasswordStrength(masterPassword);

  const handleRegister = async () => {
    if (!email || !password || !masterPassword) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }
    if (masterPassword !== confirmMaster) {
      Alert.alert('Error', 'Master passwords do not match.');
      return;
    }
    if (masterPassword.length < 8) {
      Alert.alert('Error', 'Master password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      const { recoveryKey: rk } = await register(email, password, masterPassword);
      setRecoveryKey(rk);
    } catch (e: any) {
      Alert.alert('Registration Failed', e.message ?? 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyRecovery = async () => {
    if (recoveryKey) {
      await Clipboard.setStringAsync(recoveryKey);
      setCopiedRecovery(true);
      setTimeout(() => setCopiedRecovery(false), 2000);
    }
  };

  const handleRecoveryDone = () => {
    setRecoveryKey(null);
    router.replace('/(tabs)/vault');
  };

  return (
    <>
      <ScrollView className="flex-1 bg-background" contentContainerStyle={{ padding: 24 }}>
        <View className="items-center gap-3 pb-8 pt-12">
          <View className="h-16 w-16 items-center justify-center rounded-2xl bg-primary">
            <ShieldCheckIcon size={32} color="white" />
          </View>
          <Text className="text-2xl font-bold text-foreground">Create Account</Text>
          <Text className="text-center text-sm text-muted-foreground">
            Your master password is never sent to our servers.
          </Text>
        </View>

        <View className="gap-5">
          <InputField
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <InputField
            label="Account Password"
            value={password}
            onChangeText={setPassword}
            placeholder="For account access"
            secureTextEntry={!showPassword}
            rightIcon={
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOffIcon size={18} color="#888" /> : <EyeIcon size={18} color="#888" />}
              </TouchableOpacity>
            }
          />

          <View className="gap-2">
            <InputField
              label="Master Password"
              value={masterPassword}
              onChangeText={setMasterPassword}
              placeholder="Used to encrypt your vault"
              secureTextEntry={!showMaster}
              rightIcon={
                <TouchableOpacity onPress={() => setShowMaster(!showMaster)}>
                  {showMaster ? <EyeOffIcon size={18} color="#888" /> : <EyeIcon size={18} color="#888" />}
                </TouchableOpacity>
              }
            />
            {masterPassword.length > 0 && (
              <View className="gap-1">
                <View className="h-1.5 overflow-hidden rounded-full bg-secondary">
                  <View
                    className="h-full rounded-full"
                    style={{
                      width: `${(masterStrength.score / 4) * 100}%`,
                      backgroundColor: masterStrength.color,
                    }}
                  />
                </View>
                <Text className="text-xs" style={{ color: masterStrength.color }}>
                  {masterStrength.label}
                </Text>
              </View>
            )}
          </View>

          <InputField
            label="Confirm Master Password"
            value={confirmMaster}
            onChangeText={setConfirmMaster}
            placeholder="Repeat master password"
            secureTextEntry
          />

          <View className="rounded-xl bg-secondary p-4">
            <Text className="text-xs font-medium text-muted-foreground">
              ⚠ Your master password encrypts your vault locally. If you forget it, your data cannot be recovered without your recovery key.
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleRegister}
            disabled={loading}
            className="items-center rounded-2xl bg-primary py-4"
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-base font-semibold text-primary-foreground">Create Account</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.replace('/login')} className="items-center py-2">
            <Text className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <Text className="font-semibold text-foreground">Sign in</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Recovery Key Modal */}
      <Modal visible={!!recoveryKey} animationType="slide" transparent>
        <View className="flex-1 items-center justify-center bg-black/60 p-6">
          <View className="w-full rounded-3xl bg-background p-6 gap-5">
            <View className="items-center gap-2">
              <CheckCircleIcon size={48} color="#22c55e" />
              <Text className="text-xl font-bold text-foreground">Save Your Recovery Key</Text>
              <Text className="text-center text-sm text-muted-foreground">
                This is the only way to recover your vault if you forget your master password. Store it safely.
              </Text>
            </View>

            <View className="rounded-xl bg-secondary p-4">
              <Text className="text-center font-mono text-base font-semibold text-foreground tracking-widest">
                {recoveryKey}
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleCopyRecovery}
              className="flex-row items-center justify-center gap-2 rounded-xl border border-border py-3"
            >
              <CopyIcon size={16} color="#888" />
              <Text className="text-sm font-medium text-foreground">
                {copiedRecovery ? 'Copied!' : 'Copy to Clipboard'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleRecoveryDone}
              className="items-center rounded-2xl bg-primary py-4"
            >
              <Text className="text-base font-semibold text-primary-foreground">
                I've saved my recovery key
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

function InputField({
  label,
  rightIcon,
  ...props
}: {
  label: string;
  rightIcon?: React.ReactNode;
} & React.ComponentProps<typeof TextInput>) {
  return (
    <View className="gap-1.5">
      <Text className="text-sm font-medium text-foreground">{label}</Text>
      <View className="flex-row items-center rounded-xl border border-border bg-secondary px-4">
        <TextInput
          className="flex-1 py-3.5 text-base text-foreground"
          placeholderTextColor="#888"
          {...props}
        />
        {rightIcon}
      </View>
    </View>
  );
}
