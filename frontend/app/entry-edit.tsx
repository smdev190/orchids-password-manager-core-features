import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeftIcon, EyeIcon, EyeOffIcon, RefreshCwIcon } from 'lucide-react-native';
import { useVaultStore } from '@/lib/store';
import { VaultEntryData } from '@/lib/types';
import { generatePassword } from '@/lib/crypto';

export default function EditEntryScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { entries, decryptEntry, updateEntry } = useVaultStore((s) => ({
    entries: s.entries,
    decryptEntry: s.decryptEntry,
    updateEntry: s.updateEntry,
  }));

  const entry = entries.find((e) => e.id === id);
  const [decrypted, setDecrypted] = useState<VaultEntryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Field states
  const [title, setTitle] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [url, setUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [ssid, setSsid] = useState('');
  const [wifiPassword, setWifiPassword] = useState('');
  const [securityType, setSecurityType] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  useEffect(() => {
    if (!entry) return;
    (async () => {
      try {
        const data = await decryptEntry(entry);
        setDecrypted(data);
        setTitle(data.title ?? '');

        if (data.type === 'login') {
          setUsername((data as any).username ?? '');
          setPassword((data as any).password ?? '');
          setUrl((data as any).url ?? '');
          setNotes((data as any).notes ?? '');
        } else if (data.type === 'note') {
          setNoteContent((data as any).content ?? '');
        } else if (data.type === 'card') {
          setCardHolder((data as any).cardHolder ?? '');
          setCardNumber((data as any).cardNumber ?? '');
          setExpiryDate((data as any).expiryDate ?? '');
          setCvv((data as any).cvv ?? '');
          setNotes((data as any).notes ?? '');
        } else if (data.type === 'wifi') {
          setSsid((data as any).ssid ?? '');
          setWifiPassword((data as any).password ?? '');
          setSecurityType((data as any).securityType ?? '');
        } else if (data.type === 'identity') {
          setFirstName((data as any).firstName ?? '');
          setLastName((data as any).lastName ?? '');
          setEmail((data as any).email ?? '');
          setPhone((data as any).phone ?? '');
          setAddress((data as any).address ?? '');
        }
      } catch {
        Alert.alert('Error', 'Failed to decrypt entry.');
        router.back();
      } finally {
        setLoading(false);
      }
    })();
  }, [entry]);

  const buildUpdatedData = (): VaultEntryData | null => {
    if (!title.trim() || !decrypted) return null;

    switch (decrypted.type) {
      case 'login':
        return { type: 'login', title, username, password, url, notes };
      case 'note':
        return { type: 'note', title, content: noteContent };
      case 'card':
        return { type: 'card', title, cardHolder, cardNumber, expiryDate, cvv, notes };
      case 'wifi':
        return { type: 'wifi', title, ssid, password: wifiPassword, securityType };
      case 'identity':
        return { type: 'identity', title, firstName, lastName, email, phone, address };
    }
  };

  const handleSave = async () => {
    const data = buildUpdatedData();
    if (!data) {
      Alert.alert('Error', 'Title is required.');
      return;
    }

    setSaving(true);
    try {
      await updateEntry(id!, data, entry?.category_id ?? undefined);
      router.back();
      router.back(); // go back past detail too
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <View className="flex-row items-center justify-between px-5 pb-4 pt-14">
        <TouchableOpacity onPress={() => router.back()} className="flex-row items-center gap-2">
          <ArrowLeftIcon size={20} color="#888" />
          <Text className="text-base text-foreground">Cancel</Text>
        </TouchableOpacity>
        <Text className="text-lg font-bold text-foreground">Edit Entry</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color="#6366f1" />
          ) : (
            <Text className="text-base font-semibold" style={{ color: '#6366f1' }}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <FormField label="Title" value={title} onChangeText={setTitle} placeholder="Title" />

        {decrypted?.type === 'login' && (
          <>
            <FormField label="Username / Email" value={username} onChangeText={setUsername} placeholder="username@email.com" autoCapitalize="none" />
            <View className="mb-4 gap-1.5">
              <Text className="text-sm font-medium text-foreground">Password</Text>
              <View className="flex-row items-center rounded-xl border border-border bg-secondary px-4">
                <TextInput
                  className="flex-1 py-3.5 text-base text-foreground"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  placeholderTextColor="#888"
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} className="mr-2">
                  {showPassword ? <EyeOffIcon size={16} color="#888" /> : <EyeIcon size={16} color="#888" />}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setPassword(generatePassword({ length: 16, uppercase: true, lowercase: true, numbers: true, symbols: true }))}>
                  <RefreshCwIcon size={16} color="#6366f1" />
                </TouchableOpacity>
              </View>
            </View>
            <FormField label="URL" value={url} onChangeText={setUrl} placeholder="https://..." autoCapitalize="none" />
            <FormField label="Notes" value={notes} onChangeText={setNotes} multiline />
          </>
        )}

        {decrypted?.type === 'note' && (
          <FormField label="Content" value={noteContent} onChangeText={setNoteContent} multiline />
        )}

        {decrypted?.type === 'card' && (
          <>
            <FormField label="Card Holder" value={cardHolder} onChangeText={setCardHolder} placeholder="John Doe" />
            <FormField label="Card Number" value={cardNumber} onChangeText={setCardNumber} placeholder="0000 0000 0000 0000" keyboardType="numeric" />
            <FormField label="Expiry Date" value={expiryDate} onChangeText={setExpiryDate} placeholder="MM/YY" />
            <FormField label="CVV" value={cvv} onChangeText={setCvv} placeholder="000" keyboardType="numeric" secureTextEntry />
            <FormField label="Notes" value={notes} onChangeText={setNotes} multiline />
          </>
        )}

        {decrypted?.type === 'wifi' && (
          <>
            <FormField label="SSID" value={ssid} onChangeText={setSsid} />
            <FormField label="Password" value={wifiPassword} onChangeText={setWifiPassword} secureTextEntry />
            <FormField label="Security Type" value={securityType} onChangeText={setSecurityType} />
          </>
        )}

        {decrypted?.type === 'identity' && (
          <>
            <FormField label="First Name" value={firstName} onChangeText={setFirstName} />
            <FormField label="Last Name" value={lastName} onChangeText={setLastName} />
            <FormField label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
            <FormField label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            <FormField label="Address" value={address} onChangeText={setAddress} multiline />
          </>
        )}
      </ScrollView>
    </View>
  );
}

function FormField({ label, multiline, ...props }: { label: string; multiline?: boolean } & React.ComponentProps<typeof TextInput>) {
  return (
    <View className="mb-4 gap-1.5">
      <Text className="text-sm font-medium text-foreground">{label}</Text>
      <TextInput
        className={`rounded-xl border border-border bg-secondary px-4 text-base text-foreground ${multiline ? 'min-h-24 py-3' : 'py-3.5'}`}
        placeholderTextColor="#888"
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        {...props}
      />
    </View>
  );
}
