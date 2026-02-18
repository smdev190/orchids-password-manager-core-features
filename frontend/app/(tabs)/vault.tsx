import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  AppState,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  PlusIcon,
  SearchIcon,
  ShieldCheckIcon,
  GlobeIcon,
  FileTextIcon,
  CreditCardIcon,
  WifiIcon,
  UserIcon,
  LockIcon,
  RefreshCwIcon,
} from 'lucide-react-native';
import { useVaultStore } from '@/lib/store';
import { VaultEntry, EntryType } from '@/lib/types';
import { useColorScheme } from 'nativewind';

const CATEGORY_ICONS: Record<EntryType, React.ComponentType<any>> = {
  login: GlobeIcon,
  note: FileTextIcon,
  card: CreditCardIcon,
  wifi: WifiIcon,
  identity: UserIcon,
};

const CATEGORY_COLORS: Record<EntryType, string> = {
  login: '#6366f1',
  note: '#f59e0b',
  card: '#10b981',
  wifi: '#3b82f6',
  identity: '#ec4899',
};

const FILTER_TABS: { key: EntryType | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'login', label: 'Logins' },
  { key: 'note', label: 'Notes' },
  { key: 'card', label: 'Cards' },
  { key: 'wifi', label: 'WiFi' },
  { key: 'identity', label: 'Identity' },
];

export default function VaultScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const {
    entries,
    isLoading,
    isUnlocked,
    user,
    loadEntries,
    loadCategories,
    lock,
    updateActivity,
    syncStatus,
    syncVault,
    lastActivity,
  } = useVaultStore((s) => ({
    entries: s.entries,
    isLoading: s.isLoading,
    isUnlocked: s.isUnlocked,
    user: s.user,
    loadEntries: s.loadEntries,
    loadCategories: s.loadCategories,
    lock: s.lock,
    updateActivity: s.updateActivity,
    syncStatus: s.syncStatus,
    syncVault: s.syncVault,
    lastActivity: s.lastActivity,
  }));

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<EntryType | 'all'>('all');
  const autoLockTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isUnlocked) {
      router.replace('/unlock');
      return;
    }
    loadEntries();
    loadCategories();
  }, [isUnlocked]);

  // Auto-lock based on inactivity
  useEffect(() => {
    const autoLockMinutes = user?.auto_lock_minutes ?? 5;
    if (autoLockTimer.current) clearInterval(autoLockTimer.current);

    autoLockTimer.current = setInterval(() => {
      const elapsed = (Date.now() - lastActivity) / 1000 / 60;
      if (elapsed >= autoLockMinutes) {
        lock();
        router.replace('/unlock');
      }
    }, 30_000);

    return () => {
      if (autoLockTimer.current) clearInterval(autoLockTimer.current);
    };
  }, [lastActivity, user?.auto_lock_minutes]);

  // Lock on app background
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') {
        // Short grace period
        setTimeout(() => {
          if (AppState.currentState !== 'active') {
            lock();
          }
        }, 30000);
      }
    });
    return () => sub.remove();
  }, []);

  const filtered = entries.filter((e) => {
    const matchType = filter === 'all' || e.entry_type === filter;
    const matchSearch =
      !search ||
      (e.title_hint ?? '').toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  const handleEntryPress = (entry: VaultEntry) => {
    updateActivity();
    router.push({ pathname: '/entry-detail', params: { id: entry.id } });
  };

  const handleAdd = () => {
    updateActivity();
    router.push('/entry-add');
  };

  const handleSync = async () => {
    updateActivity();
    await syncVault();
    await loadEntries();
  };

  return (
    <View className="flex-1 bg-background" onTouchStart={updateActivity}>
      {/* Header */}
      <View className="px-5 pb-4 pt-14">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <ShieldCheckIcon size={24} color="#6366f1" />
            <Text className="text-xl font-bold text-foreground">VaultGuard</Text>
          </View>
          <View className="flex-row items-center gap-3">
            <TouchableOpacity onPress={handleSync} disabled={syncStatus === 'syncing'}>
              {syncStatus === 'syncing' ? (
                <ActivityIndicator size="small" color="#6366f1" />
              ) : (
                <RefreshCwIcon size={20} color={syncStatus === 'error' ? '#ef4444' : '#888'} />
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={handleAdd}>
              <View className="h-8 w-8 items-center justify-center rounded-full bg-primary">
                <PlusIcon size={18} color="white" />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Search */}
        <View className="mt-4 flex-row items-center rounded-xl border border-border bg-secondary px-4 py-2.5">
          <SearchIcon size={16} color="#888" />
          <TextInput
            className="ml-2 flex-1 text-base text-foreground"
            value={search}
            onChangeText={setSearch}
            placeholder="Search vault..."
            placeholderTextColor="#888"
            onFocus={updateActivity}
          />
        </View>

        {/* Filter tabs */}
        <View className="mt-3 flex-row gap-2">
          {FILTER_TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => { setFilter(tab.key as any); updateActivity(); }}
              className={`rounded-full px-3 py-1.5 ${filter === tab.key ? 'bg-primary' : 'bg-secondary'}`}
            >
              <Text
                className={`text-xs font-semibold ${filter === tab.key ? 'text-primary-foreground' : 'text-muted-foreground'}`}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Entries */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#6366f1" />
          <Text className="mt-3 text-sm text-muted-foreground">Decrypting vault...</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View className="flex-1 items-center justify-center gap-4 px-8">
          <View className="h-20 w-20 items-center justify-center rounded-3xl bg-secondary">
            <LockIcon size={36} color="#888" />
          </View>
          <Text className="text-center text-lg font-semibold text-foreground">
            {search ? 'No results found' : 'Your vault is empty'}
          </Text>
          <Text className="text-center text-sm text-muted-foreground">
            {search ? 'Try a different search.' : 'Tap + to add your first entry.'}
          </Text>
          {!search && (
            <TouchableOpacity
              onPress={handleAdd}
              className="mt-2 items-center rounded-2xl bg-primary px-8 py-3.5"
            >
              <Text className="font-semibold text-primary-foreground">Add Entry</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
          ItemSeparatorComponent={() => <View className="h-2" />}
          renderItem={({ item }) => (
            <EntryCard entry={item} onPress={() => handleEntryPress(item)} />
          )}
        />
      )}
    </View>
  );
}

function EntryCard({ entry, onPress }: { entry: VaultEntry; onPress: () => void }) {
  const Icon = CATEGORY_ICONS[entry.entry_type] ?? GlobeIcon;
  const color = CATEGORY_COLORS[entry.entry_type] ?? '#6366f1';

  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex-row items-center gap-4 rounded-2xl border border-border bg-card p-4"
    >
      <View
        className="h-11 w-11 items-center justify-center rounded-xl"
        style={{ backgroundColor: `${color}20` }}
      >
        <Icon size={22} color={color} />
      </View>
      <View className="flex-1">
        <Text className="font-semibold text-foreground" numberOfLines={1}>
          {entry.title_hint ?? 'Untitled'}
        </Text>
        <Text className="mt-0.5 text-xs capitalize text-muted-foreground">{entry.entry_type}</Text>
      </View>
      <Text className="text-xs text-muted-foreground">
        {new Date(entry.updated_at).toLocaleDateString()}
      </Text>
    </TouchableOpacity>
  );
}
