import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeftIcon,
  CopyIcon,
  EyeIcon,
  EyeOffIcon,
  EditIcon,
  TrashIcon,
  GlobeIcon,
  FileTextIcon,
  CreditCardIcon,
  WifiIcon,
  UserIcon,
} from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { useVaultStore } from '@/lib/store';
import { VaultEntry, VaultEntryData, LoginEntry } from '@/lib/types';

export default function EntryDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { entries, decryptEntry, deleteEntry, updateActivity } = useVaultStore((s) => ({
    entries: s.entries,
    decryptEntry: s.decryptEntry,
    deleteEntry: s.deleteEntry,
    updateActivity: s.updateActivity,
  }));

  const entry = entries.find((e) => e.id === id);
  const [decrypted, setDecrypted] = useState<VaultEntryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    if (!entry) return;
    (async () => {
      try {
        const data = await decryptEntry(entry);
        setDecrypted(data);
      } catch (e) {
        Alert.alert('Error', 'Failed to decrypt entry.');
        router.back();
      } finally {
        setLoading(false);
      }
    })();
  }, [entry]);

  const copyField = async (value: string, field: string) => {
    updateActivity();
    await Clipboard.setStringAsync(value);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
    // Auto-clear clipboard after 30s
    setTimeout(async () => {
      const current = await Clipboard.getStringAsync();
      if (current === value) await Clipboard.setStringAsync('');
    }, 30_000);
  };

  const handleDelete = () => {
    Alert.alert('Delete Entry', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteEntry(id!);
          router.back();
        },
      },
    ]);
  };

  if (!entry) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Text className="text-muted-foreground">Entry not found</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pb-4 pt-14">
        <TouchableOpacity onPress={() => router.back()} className="flex-row items-center gap-2">
          <ArrowLeftIcon size={20} color="#888" />
          <Text className="text-base text-foreground">Back</Text>
        </TouchableOpacity>
        <View className="flex-row items-center gap-3">
          <TouchableOpacity onPress={() => router.push({ pathname: '/entry-edit', params: { id } })}>
            <EditIcon size={20} color="#6366f1" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete}>
            <TrashIcon size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#6366f1" />
          <Text className="mt-3 text-sm text-muted-foreground">Decrypting...</Text>
        </View>
      ) : decrypted ? (
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          {/* Title */}
          <View className="mb-6 items-center gap-2">
            <EntryTypeIcon type={entry.entry_type} size={40} />
            <Text className="text-2xl font-bold text-foreground">{decrypted.title}</Text>
            <Text className="capitalize text-sm text-muted-foreground">{entry.entry_type}</Text>
          </View>

          {decrypted.type === 'login' && (
            <LoginFields
              data={decrypted as LoginEntry}
              showPassword={showPassword}
              onTogglePassword={() => setShowPassword(!showPassword)}
              copiedField={copiedField}
              onCopy={copyField}
            />
          )}

          {decrypted.type === 'note' && (
            <FieldCard label="Content" value={(decrypted as any).content} multiline />
          )}

          {decrypted.type === 'card' && (
            <CardFields data={decrypted as any} copiedField={copiedField} onCopy={copyField} />
          )}

          {decrypted.type === 'wifi' && (
            <WifiFields
              data={decrypted as any}
              showPassword={showPassword}
              onTogglePassword={() => setShowPassword(!showPassword)}
              copiedField={copiedField}
              onCopy={copyField}
            />
          )}

          {decrypted.type === 'identity' && (
            <IdentityFields data={decrypted as any} copiedField={copiedField} onCopy={copyField} />
          )}

          <View className="mt-6 rounded-xl bg-secondary p-4">
            <Text className="text-xs text-muted-foreground">
              Created: {new Date(entry.created_at).toLocaleString()}
            </Text>
            <Text className="text-xs text-muted-foreground">
              Updated: {new Date(entry.updated_at).toLocaleString()}
            </Text>
          </View>
        </ScrollView>
      ) : null}
    </View>
  );
}

function EntryTypeIcon({ type, size = 24 }: { type: string; size?: number }) {
  const icons: Record<string, React.ComponentType<any>> = {
    login: GlobeIcon,
    note: FileTextIcon,
    card: CreditCardIcon,
    wifi: WifiIcon,
    identity: UserIcon,
  };
  const colors: Record<string, string> = {
    login: '#6366f1',
    note: '#f59e0b',
    card: '#10b981',
    wifi: '#3b82f6',
    identity: '#ec4899',
  };
  const Icon = icons[type] ?? GlobeIcon;
  const color = colors[type] ?? '#6366f1';
  return (
    <View
      className="h-16 w-16 items-center justify-center rounded-2xl"
      style={{ backgroundColor: `${color}20` }}
    >
      <Icon size={size} color={color} />
    </View>
  );
}

function CopyableField({
  label,
  value,
  copiedField,
  fieldKey,
  onCopy,
  secret = false,
  showSecret = false,
  onToggleSecret,
  multiline = false,
}: {
  label: string;
  value: string;
  copiedField: string | null;
  fieldKey: string;
  onCopy: (v: string, k: string) => void;
  secret?: boolean;
  showSecret?: boolean;
  onToggleSecret?: () => void;
  multiline?: boolean;
}) {
  const displayValue = secret && !showSecret ? '••••••••••' : value;
  return (
    <View className="mb-3 rounded-xl border border-border bg-card p-4">
      <Text className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </Text>
      <View className="flex-row items-center justify-between">
        <Text
          className="flex-1 text-base text-foreground"
          numberOfLines={multiline ? undefined : 1}
        >
          {displayValue}
        </Text>
        <View className="flex-row items-center gap-3">
          {secret && onToggleSecret && (
            <TouchableOpacity onPress={onToggleSecret}>
              {showSecret ? <EyeOffIcon size={16} color="#888" /> : <EyeIcon size={16} color="#888" />}
            </TouchableOpacity>
          )}
          {value && (
            <TouchableOpacity onPress={() => onCopy(value, fieldKey)}>
              <CopyIcon size={16} color={copiedField === fieldKey ? '#22c55e' : '#888'} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

function FieldCard({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  return (
    <View className="mb-3 rounded-xl border border-border bg-card p-4">
      <Text className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</Text>
      <Text className="text-base text-foreground" numberOfLines={multiline ? undefined : 1}>{value}</Text>
    </View>
  );
}

function LoginFields({ data, showPassword, onTogglePassword, copiedField, onCopy }: any) {
  return (
    <>
      {data.username && (
        <CopyableField label="Username" value={data.username} copiedField={copiedField} fieldKey="username" onCopy={onCopy} />
      )}
      {data.password && (
        <CopyableField
          label="Password"
          value={data.password}
          copiedField={copiedField}
          fieldKey="password"
          onCopy={onCopy}
          secret
          showSecret={showPassword}
          onToggleSecret={onTogglePassword}
        />
      )}
      {data.url && <CopyableField label="URL" value={data.url} copiedField={copiedField} fieldKey="url" onCopy={onCopy} />}
      {data.notes && <FieldCard label="Notes" value={data.notes} multiline />}
    </>
  );
}

function CardFields({ data, copiedField, onCopy }: any) {
  return (
    <>
      {data.cardHolder && <CopyableField label="Card Holder" value={data.cardHolder} copiedField={copiedField} fieldKey="cardHolder" onCopy={onCopy} />}
      {data.cardNumber && <CopyableField label="Card Number" value={data.cardNumber} copiedField={copiedField} fieldKey="cardNumber" onCopy={onCopy} secret />}
      {data.expiryDate && <CopyableField label="Expiry Date" value={data.expiryDate} copiedField={copiedField} fieldKey="expiry" onCopy={onCopy} />}
      {data.cvv && <CopyableField label="CVV" value={data.cvv} copiedField={copiedField} fieldKey="cvv" onCopy={onCopy} secret />}
      {data.notes && <FieldCard label="Notes" value={data.notes} multiline />}
    </>
  );
}

function WifiFields({ data, showPassword, onTogglePassword, copiedField, onCopy }: any) {
  return (
    <>
      {data.ssid && <CopyableField label="Network Name (SSID)" value={data.ssid} copiedField={copiedField} fieldKey="ssid" onCopy={onCopy} />}
      {data.password && (
        <CopyableField label="Password" value={data.password} copiedField={copiedField} fieldKey="wifipassword" onCopy={onCopy} secret showSecret={showPassword} onToggleSecret={onTogglePassword} />
      )}
      {data.securityType && <FieldCard label="Security Type" value={data.securityType} />}
    </>
  );
}

function IdentityFields({ data, copiedField, onCopy }: any) {
  return (
    <>
      {data.firstName && <CopyableField label="First Name" value={data.firstName} copiedField={copiedField} fieldKey="firstName" onCopy={onCopy} />}
      {data.lastName && <CopyableField label="Last Name" value={data.lastName} copiedField={copiedField} fieldKey="lastName" onCopy={onCopy} />}
      {data.email && <CopyableField label="Email" value={data.email} copiedField={copiedField} fieldKey="email" onCopy={onCopy} />}
      {data.phone && <CopyableField label="Phone" value={data.phone} copiedField={copiedField} fieldKey="phone" onCopy={onCopy} />}
      {data.address && <FieldCard label="Address" value={data.address} multiline />}
    </>
  );
}
