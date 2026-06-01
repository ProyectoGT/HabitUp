import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Button } from '@/components/ui';
import { Search, Briefcase, MessageSquare, ChevronRight } from 'lucide-react-native';

const ONBOARDING_STEPS = [
  {
    title: 'Encuentra profesionales fácilmente',
    description: 'Busca y conecta con los mejores expertos para tus proyectos y necesidades del hogar.',
    icon: Search,
  },
  {
    title: 'Gestiona todo en un lugar',
    description: 'Controla solicitudes, proyectos y presupuestos de forma clara y sin complicaciones.',
    icon: Briefcase,
  },
  {
    title: 'Chatea, paga y revisa',
    description: 'Comunícate directamente, realiza pagos seguros y deja reseñas desde una sola app.',
    icon: MessageSquare,
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  const handleNext = () => {
    if (step < ONBOARDING_STEPS.length - 1) {
      setStep(step + 1);
    } else {
      router.replace('/(auth)/login');
    }
  };

  const handleSkip = () => {
    router.replace('/(auth)/login');
  };

  const CurrentIcon = ONBOARDING_STEPS[step].icon;

  return (
    <Screen safeArea className="flex-1 justify-between px-6 pb-8 pt-4">
      {/* Skip Button */}
      <View className="items-end">
        <Button 
          label="Saltar" 
          variant="ghost" 
          onPress={handleSkip} 
          size="sm"
        />
      </View>

      {/* Content */}
      <View className="flex-1 items-center justify-center mt-8">
        <View className="w-48 h-48 bg-primary/10 rounded-full items-center justify-center mb-10">
          <CurrentIcon size={80} color="#6366F1" strokeWidth={1.5} />
        </View>

        <Text className="text-3xl font-bold text-center text-text mb-4 px-4">
          {ONBOARDING_STEPS[step].title}
        </Text>
        <Text className="text-base text-center text-muted-text px-6">
          {ONBOARDING_STEPS[step].description}
        </Text>
      </View>

      {/* Footer */}
      <View className="pt-8">
        {/* Progress indicators */}
        <View className="flex-row justify-center space-x-2 mb-8">
          {ONBOARDING_STEPS.map((_, index) => (
            <View
              key={index}
              className={`h-2 rounded-full mx-1 ${
                index === step ? 'w-8 bg-primary' : 'w-2 bg-border'
              }`}
            />
          ))}
        </View>

        <Button
          label={step === ONBOARDING_STEPS.length - 1 ? 'Comenzar' : 'Siguiente'}
          onPress={handleNext}
          size="lg"
          rightIcon={<ChevronRight size={20} color="white" />}
          className="shadow-sm shadow-primary/30"
        />
      </View>
    </Screen>
  );
}
