import React, { useState, useRef } from 'react';
import {
  View, TextInput, TouchableOpacity, ActivityIndicator,
  type TextInput as TextInputType,
} from 'react-native';
import { SendHorizonal } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';

interface Props {
  onSend: (text: string) => void;
  isSending: boolean;
  disabled?: boolean;
}

export function ChatInput({ onSend, isSending, disabled }: Props) {
  const [text, setText] = useState('');
  const inputRef = useRef<TextInputType>(null);
  
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || isSending || disabled) return;
    onSend(trimmed);
    setText('');
    inputRef.current?.clear();
  };

  const canSend = !!text.trim() && !isSending && !disabled;

  return (
    <View className="flex-row items-end px-4 py-3 bg-surface border-t border-border/50 gap-3 pb-8">
      <View className="flex-1 bg-surface-active rounded-3xl border border-border/50 min-h-[44px] justify-center px-4">
        <TextInput
          ref={inputRef}
          className="text-text text-base py-2 max-h-32"
          placeholder="Escribe un mensaje..."
          placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
          value={text}
          onChangeText={setText}
          multiline
          returnKeyType="default"
          editable={!disabled}
        />
      </View>
      <TouchableOpacity
        onPress={handleSend}
        disabled={!canSend}
        className={`w-11 h-11 rounded-full items-center justify-center ${
          canSend ? 'bg-primary shadow-sm shadow-primary/30' : 'bg-surface-active border border-border/50'
        }`}
      >
        {isSending
          ? <ActivityIndicator size="small" color="#fff" />
          : <SendHorizonal size={20} color={canSend ? '#fff' : (isDark ? '#64748B' : '#94A3B8')} />}
      </TouchableOpacity>
    </View>
  );
}
