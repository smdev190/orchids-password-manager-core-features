import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Switch,
  ScrollView,
  TextInput,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { RefreshCwIcon, CopyIcon, CheckIcon } from 'lucide-react-native';
import { generatePassword, getPasswordStrength } from '@/lib/crypto';

export default function GeneratorScreen() {
  const [length, setLength] = useState(16);
  const [uppercase, setUppercase] = useState(true);
  const [lowercase, setLowercase] = useState(true);
  const [numbers, setNumbers] = useState(true);
  const [symbols, setSymbols] = useState(true);
  const [generated, setGenerated] = useState('');
  const [copied, setCopied] = useState(false);

  const strength = getPasswordStrength(generated);

  const handleGenerate = () => {
    const p = generatePassword({ length, uppercase, lowercase, numbers, symbols });
    setGenerated(p);
    setCopied(false);
  };

  const handleCopy = async () => {
    if (!generated) return;
    await Clipboard.setStringAsync(generated);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    // Auto-clear clipboard after 30s
    setTimeout(async () => {
      const cur = await Clipboard.getStringAsync();
      if (cur === generated) await Clipboard.setStringAsync('');
    }, 30_000);
  };

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ padding: 20 }}>
      <View className="pb-4 pt-12">
        <Text className="text-2xl font-bold text-foreground">Password Generator</Text>
        <Text className="mt-1 text-sm text-muted-foreground">
          Generate strong, high-entropy passwords.
        </Text>
      </View>

      {/* Generated password */}
      <View className="mb-6 rounded-2xl border border-border bg-card p-5">
        {generated ? (
          <>
            <Text
              className="text-center font-mono text-lg font-semibold text-foreground"
              selectable
            >
              {generated}
            </Text>
            <View className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
              <View
                className="h-full rounded-full"
                style={{
                  width: `${(strength.score / 4) * 100}%`,
                  backgroundColor: strength.color,
                }}
              />
            </View>
            <Text className="mt-1 text-center text-xs" style={{ color: strength.color }}>
              {strength.label}
            </Text>
          </>
        ) : (
          <Text className="text-center text-muted-foreground">Press Generate to create a password</Text>
        )}
      </View>

      {/* Length slider */}
      <View className="mb-5">
        <View className="flex-row items-center justify-between">
          <Text className="text-sm font-medium text-foreground">Length</Text>
          <Text className="text-base font-bold text-foreground">{length}</Text>
        </View>
        <View className="mt-3 flex-row gap-2 flex-wrap">
          {[8, 12, 16, 20, 24, 32].map((l) => (
            <TouchableOpacity
              key={l}
              onPress={() => setLength(l)}
              className={`rounded-lg px-4 py-2 ${length === l ? 'bg-primary' : 'bg-secondary'}`}
            >
              <Text className={`text-sm font-semibold ${length === l ? 'text-primary-foreground' : 'text-muted-foreground'}`}>
                {l}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View className="mt-3 flex-row items-center gap-3">
          <Text className="text-xs text-muted-foreground">Custom:</Text>
          <TextInput
            className="w-20 rounded-lg border border-border bg-secondary px-3 py-2 text-base text-foreground"
            value={String(length)}
            onChangeText={(v) => {
              const n = parseInt(v);
              if (!isNaN(n) && n >= 4 && n <= 128) setLength(n);
            }}
            keyboardType="numeric"
            maxLength={3}
          />
        </View>
      </View>

      {/* Options */}
      <View className="mb-6 gap-3 rounded-2xl bg-card p-4 border border-border">
        <ToggleRow label="Uppercase (A-Z)" value={uppercase} onChange={setUppercase} />
        <View className="h-px bg-border" />
        <ToggleRow label="Lowercase (a-z)" value={lowercase} onChange={setLowercase} />
        <View className="h-px bg-border" />
        <ToggleRow label="Numbers (0-9)" value={numbers} onChange={setNumbers} />
        <View className="h-px bg-border" />
        <ToggleRow label="Symbols (!@#$...)" value={symbols} onChange={setSymbols} />
      </View>

      {/* Buttons */}
      <View className="gap-3">
        <TouchableOpacity
          onPress={handleGenerate}
          className="flex-row items-center justify-center gap-3 rounded-2xl bg-primary py-4"
        >
          <RefreshCwIcon size={20} color="white" />
          <Text className="text-base font-semibold text-primary-foreground">Generate</Text>
        </TouchableOpacity>

        {generated && (
          <TouchableOpacity
            onPress={handleCopy}
            className="flex-row items-center justify-center gap-3 rounded-2xl border border-border py-4"
          >
            {copied ? <CheckIcon size={20} color="#22c55e" /> : <CopyIcon size={20} color="#888" />}
            <Text className="text-base font-semibold text-foreground">
              {copied ? 'Copied!' : 'Copy to Clipboard'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tips */}
      <View className="mt-6 rounded-2xl bg-secondary p-4">
        <Text className="text-xs font-semibold text-foreground">Security Tips</Text>
        <Text className="mt-2 text-xs leading-5 text-muted-foreground">
          • Use at least 16 characters for maximum security{'\n'}
          • Enable all character types for higher entropy{'\n'}
          • Never reuse passwords across sites{'\n'}
          • Clipboard auto-clears after 30 seconds
        </Text>
      </View>
    </ScrollView>
  );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="text-base text-foreground">{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: '#3f3f46', true: '#6366f1' }}
        thumbColor="white"
      />
    </View>
  );
}
