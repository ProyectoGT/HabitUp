import React, { Component, type ReactNode } from 'react';
import { View, Text } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import { Button } from './ui/Button';
import { captureError } from '@/services/observability';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    captureError(error, { componentStack: info.componentStack ?? undefined });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <View className="flex-1 items-center justify-center px-6">
        <View className="w-16 h-16 bg-error/10 rounded-full items-center justify-center mb-4">
          <AlertTriangle size={32} color="#EF4444" />
        </View>
        <Text className="text-lg font-semibold text-center mb-2">
          Algo salio mal
        </Text>
        <Text className="text-gray-500 text-center mb-6 leading-relaxed">
          {this.state.error?.message ?? 'Ocurrio un error inesperado'}
        </Text>
        <Button label="Reintentar" onPress={this.handleRetry} />
      </View>
    );
  }
}
