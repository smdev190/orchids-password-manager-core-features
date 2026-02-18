import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ShieldCheckIcon, EyeIcon, EyeOffIcon } from 'lucide-react-native';
import { useVaultStore } from '@/lib/store';

export default function LoginScreen() {
  const router = useRouter();
  const login = useVaultStore((s) => s.login);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password.');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      router.replace('/unlock');
    } catch (e: any) {
      Alert.alert('Login Failed', e.message ?? 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ padding: 24 }}>
      <View className="items-center gap-3 pb-8 pt-16">
        <View className="h-16 w-16 items-center justify-center rounded-2xl bg-primary">
          <ShieldCheckIcon size={32} color="white" />
        </View>
        <Text className="text-2xl font-bold text-foreground">Welcome Back</Text>
        <Text className="text-center text-sm text-muted-foreground">
          Sign in to access your vault
        </Text>
      </View>

      <View className="gap-5">
        <View className="gap-1.5">
          <Text className="text-sm font-medium text-foreground">Email</Text>
          <TextInput
            className="rounded-xl border border-border bg-secondary px-4 py-3.5 text-base text-foreground"
            value={email}
            onChangeText={setEmail}
            placeholder="you@email.com"
            placeholderTextColor="#888"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View className="gap-1.5">
          <Text className="text-sm font-medium text-foreground">Password</Text>
          <View className="flex-row items-center rounded-xl border border-border bg-secondary px-4">
            <TextInput
              className="flex-1 py-3.5 text-base text-foreground"
              value={password}
              onChangeText={setPassword}
              placeholder="Account password"
              placeholderTextColor="#888"
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              {showPassword ? <EyeOffIcon size={18} color="#888" /> : <EyeIcon size={18} color="#888" />}
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleLogin}
          disabled={loading}
          className="items-center rounded-2xl bg-primary py-4"
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-base font-semibold text-primary-foreground">Sign In</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.replace('/register')} className="items-center py-2">
          <Text className="text-sm text-muted-foreground">
            No account?{' '}
            <Text className="font-semibold text-foreground">Create one</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
