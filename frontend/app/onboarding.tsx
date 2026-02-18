import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ShieldCheckIcon, KeyRoundIcon, FingerprintIcon, CloudIcon } from 'lucide-react-native';
import { setOnboarded } from '@/lib/storage';

export default function OnboardingScreen() {
  const router = useRouter();

  const handleGetStarted = async () => {
    await setOnboarded(true);
    router.replace('/register');
  };

  return (
    <View className="flex-1 bg-background px-6">
      {/* Hero */}
      <View className="flex-1 items-center justify-center gap-8">
        <View className="items-center gap-4">
          <View className="h-24 w-24 items-center justify-center rounded-3xl bg-primary">
            <ShieldCheckIcon size={52} color="white" />
          </View>
          <Text className="text-center text-3xl font-bold text-foreground">VaultGuard</Text>
          <Text className="text-center text-base text-muted-foreground">
            Zero-knowledge password manager.{'\n'}Your data, always encrypted.
          </Text>
        </View>

        {/* Feature bullets */}
        <View className="w-full gap-4">
          <FeatureRow
            icon={<KeyRoundIcon size={22} color="#6366f1" />}
            title="AES-256-GCM Encryption"
            desc="Military-grade encryption. Only you can decrypt your vault."
          />
          <FeatureRow
            icon={<FingerprintIcon size={22} color="#6366f1" />}
            title="Biometric Unlock"
            desc="Fingerprint & Face ID for fast, secure access."
          />
          <FeatureRow
            icon={<CloudIcon size={22} color="#6366f1" />}
            title="Zero-Knowledge Sync"
            desc="Encrypted vault synced across devices. We can't read it."
          />
        </View>
      </View>

      {/* Actions */}
      <View className="pb-12 gap-3">
        <TouchableOpacity
          onPress={handleGetStarted}
          className="items-center rounded-2xl bg-primary py-4"
        >
          <Text className="text-base font-semibold text-primary-foreground">Get Started</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.replace('/login')}
          className="items-center rounded-2xl border border-border py-4"
        >
          <Text className="text-base font-semibold text-foreground">I already have an account</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function FeatureRow({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <View className="flex-row items-start gap-4 rounded-2xl bg-secondary p-4">
      <View className="mt-0.5">{icon}</View>
      <View className="flex-1">
        <Text className="font-semibold text-foreground">{title}</Text>
        <Text className="mt-0.5 text-sm text-muted-foreground">{desc}</Text>
      </View>
    </View>
  );
}
