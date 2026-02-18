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
import { ArrowLeftIcon, EyeIcon, EyeOffIcon, RefreshCwIcon } from 'lucide-react-native';
import { useVaultStore } from '@/lib/store';
import { EntryType, VaultEntryData } from '@/lib/types';
import { generatePassword } from '@/lib/crypto';

const ENTRY_TYPES: { key: EntryType; label: string; color: string }[] = [
  { key: 'login', label: 'Login', color: '#6366f1' },
  { key: 'note', label: 'Note', color: '#f59e0b' },
  { key: 'card', label: 'Card', color: '#10b981' },
  { key: 'wifi', label: 'WiFi', color: '#3b82f6' },
  { key: 'identity', label: 'Identity', color: '#ec4899' },
];

export default function AddEntryScreen() {
  const router = useRouter();
  const addEntry = useVaultStore((s) => s.addEntry);

  const [entryType, setEntryType] = useState<EntryType>('login');
  const [loading, setLoading] = useState(false);

  // Login fields
  const [title, setTitle] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [url, setUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Note
  const [noteContent, setNoteContent] = useState('');

  // Card
  const [cardHolder, setCardHolder] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');

  // WiFi
  const [ssid, setSsid] = useState('');
  const [wifiPassword, setWifiPassword] = useState('');
  const [securityType, setSecurityType] = useState('WPA2');

  // Identity
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  const handleGeneratePassword = () => {
    const p = generatePassword({
      length: 16,
      uppercase: true,
      lowercase: true,
      numbers: true,
      symbols: true,
    });
    setPassword(p);
  };

  const buildEntryData = (): VaultEntryData | null => {
    if (!title.trim()) {
      Alert.alert('Error', 'Title is required.');
      return null;
    }

    switch (entryType) {
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
    const data = buildEntryData();
    if (!data) return;

    setLoading(true);
    try {
      await addEntry(data);
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to save entry');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pb-4 pt-14">
        <TouchableOpacity onPress={() => router.back()} className="flex-row items-center gap-2">
          <ArrowLeftIcon size={20} color="#888" />
          <Text className="text-base text-foreground">Cancel</Text>
        </TouchableOpacity>
        <Text className="text-lg font-bold text-foreground">New Entry</Text>
        <TouchableOpacity onPress={handleSave} disabled={loading}>
          {loading ? (
            <ActivityIndicator size="small" color="#6366f1" />
          ) : (
            <Text className="text-base font-semibold" style={{ color: '#6366f1' }}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {/* Type selector */}
        <View className="mb-5 flex-row gap-2 flex-wrap">
          {ENTRY_TYPES.map((t) => (
            <TouchableOpacity
              key={t.key}
              onPress={() => setEntryType(t.key)}
              className={`rounded-full px-4 py-2 ${entryType === t.key ? 'bg-primary' : 'bg-secondary'}`}
            >
              <Text
                className={`text-sm font-semibold ${entryType === t.key ? 'text-primary-foreground' : 'text-muted-foreground'}`}
              >
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Common title */}
        <FormField label="Title" value={title} onChangeText={setTitle} placeholder="e.g. Gmail, Bank, Netflix..." />

        {/* Type-specific fields */}
        {entryType === 'login' && (
          <>
            <FormField label="Username / Email" value={username} onChangeText={setUsername} placeholder="username@email.com" autoCapitalize="none" />
            <View className="mb-4 gap-1.5">
              <Text className="text-sm font-medium text-foreground">Password</Text>
              <View className="flex-row items-center rounded-xl border border-border bg-secondary px-4">
                <TextInput
                  className="flex-1 py-3.5 text-base text-foreground"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Password"
                  placeholderTextColor="#888"
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} className="mr-2">
                  {showPassword ? <EyeOffIcon size={16} color="#888" /> : <EyeIcon size={16} color="#888" />}
                </TouchableOpacity>
                <TouchableOpacity onPress={handleGeneratePassword}>
                  <RefreshCwIcon size={16} color="#6366f1" />
                </TouchableOpacity>
              </View>
            </View>
            <FormField label="URL" value={url} onChangeText={setUrl} placeholder="https://..." autoCapitalize="none" keyboardType="url" />
            <FormField label="Notes" value={notes} onChangeText={setNotes} placeholder="Optional notes..." multiline />
          </>
        )}

        {entryType === 'note' && (
          <FormField label="Content" value={noteContent} onChangeText={setNoteContent} placeholder="Your secure note..." multiline />
        )}

        {entryType === 'card' && (
          <>
            <FormField label="Card Holder" value={cardHolder} onChangeText={setCardHolder} placeholder="John Doe" />
            <FormField label="Card Number" value={cardNumber} onChangeText={setCardNumber} placeholder="0000 0000 0000 0000" keyboardType="numeric" />
            <FormField label="Expiry Date" value={expiryDate} onChangeText={setExpiryDate} placeholder="MM/YY" />
            <FormField label="CVV" value={cvv} onChangeText={setCvv} placeholder="000" keyboardType="numeric" secureTextEntry />
            <FormField label="Notes" value={notes} onChangeText={setNotes} placeholder="Optional notes..." multiline />
          </>
        )}

        {entryType === 'wifi' && (
          <>
            <FormField label="Network Name (SSID)" value={ssid} onChangeText={setSsid} placeholder="My WiFi Network" />
            <FormField label="Password" value={wifiPassword} onChangeText={setWifiPassword} placeholder="Network password" secureTextEntry />
            <FormField label="Security Type" value={securityType} onChangeText={setSecurityType} placeholder="WPA2, WPA3, WEP..." />
          </>
        )}

        {entryType === 'identity' && (
          <>
            <FormField label="First Name" value={firstName} onChangeText={setFirstName} placeholder="John" />
            <FormField label="Last Name" value={lastName} onChangeText={setLastName} placeholder="Doe" />
            <FormField label="Email" value={email} onChangeText={setEmail} placeholder="john@email.com" keyboardType="email-address" autoCapitalize="none" />
            <FormField label="Phone" value={phone} onChangeText={setPhone} placeholder="+1 555 000 0000" keyboardType="phone-pad" />
            <FormField label="Address" value={address} onChangeText={setAddress} placeholder="123 Main St..." multiline />
          </>
        )}

        <View className="h-8" />
      </ScrollView>
    </View>
  );
}

function FormField({
  label,
  multiline,
  ...props
}: {
  label: string;
  multiline?: boolean;
} & React.ComponentProps<typeof TextInput>) {
  return (
    <View className="mb-4 gap-1.5">
      <Text className="text-sm font-medium text-foreground">{label}</Text>
      <TextInput
        className={`rounded-xl border border-border bg-secondary px-4 text-base text-foreground ${multiline ? 'min-h-24 py-3 leading-5' : 'py-3.5'}`}
        placeholderTextColor="#888"
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        {...props}
      />
    </View>
  );
}
