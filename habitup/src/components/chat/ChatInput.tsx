import { useState, useRef } from 'react';
import {
  View, TextInput, TouchableOpacity, ActivityIndicator,
  type TextInput as TextInputType,
} from 'react-native';

interface Props {
  onSend: (text: string) => void;
  isSending: boolean;
  disabled?: boolean;
}

export function ChatInput({ onSend, isSending, disabled }: Props) {
  const [text, setText] = useState('');
  const inputRef = useRef<TextInputType>(null);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || isSending || disabled) return;
    onSend(trimmed);
    setText('');
    inputRef.current?.clear();
  };

  return (
    <View className="flex-row items-end px-3 py-2 bg-white border-t border-gray-100 gap-2">
      <TextInput
        ref={inputRef}
        className="flex-1 bg-gray-100 rounded-2xl px-4 py-2.5 text-gray-900 text-sm max-h-28"
        placeholder="Escribe un mensaje..."
        value={text}
        onChangeText={setText}
        multiline
        returnKeyType="default"
        editable={!disabled}
      />
      <TouchableOpacity
        onPress={handleSend}
        disabled={!text.trim() || isSending || disabled}
        className={`w-10 h-10 rounded-full items-center justify-center ${
          text.trim() && !isSending ? 'bg-brand' : 'bg-gray-200'
        }`}
      >
        {isSending
          ? <ActivityIndicator size="small" color="#fff" />
          : <SendIcon active={!!text.trim()} />}
      </TouchableOpacity>
    </View>
  );
}

function SendIcon({ active }: { active: boolean }) {
  return (
    // Flecha de envío usando texto unicode, evita dependencia de iconos
    <View style={{ transform: [{ rotate: '45deg' }] }}>
      <View
        style={{
          width: 0, height: 0,
          borderLeftWidth: 8, borderLeftColor: 'transparent',
          borderRightWidth: 8, borderRightColor: 'transparent',
          borderBottomWidth: 14,
          borderBottomColor: active ? 'white' : '#9ca3af',
        }}
      />
    </View>
  );
}
