import React, { useState, useRef } from 'react';
import {
  View, TextInput, TouchableOpacity, ActivityIndicator,
  type TextInput as TextInputType,
} from 'react-native';
import { SendHorizonal } from 'lucide-react-native';
import { useThemeColors } from '@/hooks/useThemeColors';

interface Props {
  onSend: (text: string) => void;
  isSending: boolean;
  disabled?: boolean;
}

export function ChatInput({ onSend, isSending, disabled }: Props) {
  const [text, setText] = useState('');
  const inputRef = useRef<TextInputType>(null);
  const { colors } = useThemeColors();

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || isSending || disabled) return;
    onSend(trimmed);
    setText('');
    inputRef.current?.clear();
  };

  const canSend = !!text.trim() && !isSending && !disabled;

  return (
    <View className="bg-surface border-t border-border">
      <View
        className="flex-row items-end px-4 py-3 gap-3 pb-8 w-full self-center"
        style={{ maxWidth: 520 }}
      >
        <View className="flex-1 bg-surface-sunken rounded border border-border min-h-[44px] justify-center px-4">
          <TextInput
            ref={inputRef}
            className="text-text text-base py-2 max-h-32"
            placeholder="Escribe un mensaje..."
            placeholderTextColor={colors.mutedText}
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
          accessibilityRole="button"
          accessibilityLabel="Enviar mensaje"
          className={`w-11 h-11 rounded items-center justify-center ${
            canSend ? 'bg-primary' : 'bg-surface-sunken border border-border'
          }`}
        >
          {isSending
            ? <ActivityIndicator size="small" color={colors.onPrimary} />
            : (
              <SendHorizonal
                size={20}
                color={canSend ? colors.onPrimary : colors.mutedText}
              />
            )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
