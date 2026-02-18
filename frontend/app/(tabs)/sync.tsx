import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { RefreshCwIcon, CheckCircleIcon, AlertCircleIcon, CloudIcon, WifiOffIcon } from 'lucide-react-native';
import { useVaultStore } from '@/lib/store';
import { getLastSync } from '@/lib/storage';
import { useFocusEffect } from 'expo-router';

export default function SyncScreen() {
  const { syncVault, syncStatus, loadEntries, entries, isUnlocked } = useVaultStore((s) => ({
    syncVault: s.syncVault,
    syncStatus: s.syncStatus,
    loadEntries: s.loadEntries,
    entries: s.entries,
    isUnlocked: s.isUnlocked,
  }));

  const [lastSync, setLastSync] = useState<string | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      getLastSync().then(setLastSync);
    }, [])
  );

  const handleSync = async () => {
    await syncVault();
    await loadEntries();
    const ls = await getLastSync();
    setLastSync(ls);
  };

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ padding: 20 }}>
      <View className="pb-4 pt-12">
        <Text className="text-2xl font-bold text-foreground">Cloud Sync</Text>
        <Text className="mt-1 text-sm text-muted-foreground">
          Zero-knowledge: only encrypted data leaves your device.
        </Text>
      </View>

      {/* Status card */}
      <View className="mb-6 rounded-2xl border border-border bg-card p-5 items-center gap-4">
        {syncStatus === 'syncing' ? (
          <>
            <ActivityIndicator size="large" color="#6366f1" />
            <Text className="text-base font-semibold text-foreground">Syncing...</Text>
          </>
        ) : syncStatus === 'error' ? (
          <>
            <AlertCircleIcon size={48} color="#ef4444" />
            <Text className="text-base font-semibold text-foreground">Sync Failed</Text>
            <Text className="text-sm text-center text-muted-foreground">
              Check your connection and try again.
            </Text>
          </>
        ) : lastSync ? (
          <>
            <CheckCircleIcon size={48} color="#22c55e" />
            <Text className="text-base font-semibold text-foreground">Synced</Text>
            <Text className="text-sm text-muted-foreground">
              Last sync: {new Date(lastSync).toLocaleString()}
            </Text>
          </>
        ) : (
          <>
            <CloudIcon size={48} color="#888" />
            <Text className="text-base font-semibold text-foreground">Never Synced</Text>
            <Text className="text-sm text-muted-foreground">Tap sync to upload your vault.</Text>
          </>
        )}
      </View>

      {/* Stats */}
      <View className="mb-6 flex-row gap-3">
        <StatCard label="Total Entries" value={String(entries.length)} />
        <StatCard label="Encrypted" value="100%" accent />
      </View>

      {/* Sync button */}
      <TouchableOpacity
        onPress={handleSync}
        disabled={syncStatus === 'syncing' || !isUnlocked}
        className={`flex-row items-center justify-center gap-3 rounded-2xl py-4 ${
          !isUnlocked ? 'bg-secondary' : 'bg-primary'
        }`}
      >
        {syncStatus === 'syncing' ? (
          <ActivityIndicator color="white" />
        ) : (
          <>
            {isUnlocked ? <RefreshCwIcon size={20} color="white" /> : <WifiOffIcon size={20} color="#888" />}
            <Text className={`text-base font-semibold ${isUnlocked ? 'text-primary-foreground' : 'text-muted-foreground'}`}>
              {isUnlocked ? 'Sync Now' : 'Unlock vault to sync'}
            </Text>
          </>
        )}
      </TouchableOpacity>

      {/* Info */}
      <View className="mt-6 rounded-2xl bg-secondary p-4 gap-2">
        <Text className="text-xs font-semibold text-foreground">Zero-Knowledge Architecture</Text>
        <Text className="text-xs leading-5 text-muted-foreground">
          • All data is encrypted with AES-256-GCM before leaving your device{'\n'}
          • Your master password never leaves your device{'\n'}
          • The server stores only encrypted blobs{'\n'}
          • Conflict resolution: last-modified wins{'\n'}
          • Works offline: sync when connected
        </Text>
      </View>
    </ScrollView>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View className="flex-1 rounded-2xl border border-border bg-card p-4 items-center gap-1">
      <Text
        className="text-2xl font-bold"
        style={{ color: accent ? '#22c55e' : '#6366f1' }}
      >
        {value}
      </Text>
      <Text className="text-xs text-muted-foreground text-center">{label}</Text>
    </View>
  );
}
