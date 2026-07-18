import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { BriefcaseBusiness, Check, Eye, EyeOff, UserRound } from 'lucide-react-native';
import { registerSchema, type RegisterFormData } from '@/utils/validators';
import { authService } from '@/services/auth.service';
import { getAuthErrorMessage } from '@/utils/authErrors';
import { Button, Input, Screen } from '@/components/ui';

export default function RegisterScreen() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const { control, handleSubmit, watch, formState: { errors, isSubmitting }, setError } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      first_name: '', last_name: '', email: '', phone: '', locality: '', postal_code: '',
      password: '', confirm_password: '', user_type: 'cliente', accepted_terms: false,
      marketing_consent: false,
    },
  });
  const role = watch('user_type');

  const submit = async (data: RegisterFormData) => {
    try {
      const result = await authService.signUp({
        email: data.email,
        password: data.password,
        full_name: `${data.first_name} ${data.last_name}`.trim(),
        phone: data.phone,
        locality: data.locality,
        postal_code: data.postal_code,
        user_type: data.user_type,
        accepted_terms: data.accepted_terms,
        marketing_consent: data.marketing_consent,
      });
      if (!result.session) {
        router.replace({ pathname: '/(auth)/verify-email', params: { email: data.email } } as never);
      }
    } catch (error) {
      setError('root', { message: getAuthErrorMessage(error, 'No hemos podido crear la cuenta.') });
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="px-5 py-8" showsVerticalScrollIndicator={false}>
          <Text className="text-3xl font-bold text-text mb-2">Crea tu cuenta</Text>
          <Text className="text-base text-muted-text mb-8">Cuéntanos lo básico. Podrás completar el resto después.</Text>

          <Text className="text-sm font-semibold text-text mb-2">Quiero usar HabitUp como</Text>
          <Controller control={control} name="user_type" render={({ field: { onChange } }) => (
            <View className="flex-row gap-3 mb-6">
              <RoleOption label="Cliente" description="Necesito un profesional" selected={role === 'cliente'} icon="client" onPress={() => onChange('cliente')} />
              <RoleOption label="Profesional" description="Busco nuevos trabajos" selected={role === 'professional'} icon="professional" onPress={() => onChange('professional')} />
            </View>
          )} />

          <View className="flex-row gap-3">
            <View className="flex-1"><Field control={control} name="first_name" label="Nombre" error={errors.first_name?.message} /></View>
            <View className="flex-1"><Field control={control} name="last_name" label="Apellidos" error={errors.last_name?.message} /></View>
          </View>
          <Field control={control} name="email" label="Correo electrónico" error={errors.email?.message} inputProps={{ keyboardType: 'email-address', autoCapitalize: 'none', autoComplete: 'email', textContentType: 'emailAddress' }} />
          <Field control={control} name="phone" label="Teléfono" error={errors.phone?.message} inputProps={{ keyboardType: 'phone-pad', autoComplete: 'tel', textContentType: 'telephoneNumber' }} />
          <View className="flex-row gap-3">
            <View className="flex-[2]"><Field control={control} name="locality" label="Localidad" error={errors.locality?.message} /></View>
            <View className="flex-1"><Field control={control} name="postal_code" label="C. postal" error={errors.postal_code?.message} inputProps={{ keyboardType: 'number-pad', maxLength: 5 }} /></View>
          </View>
          <Controller control={control} name="password" render={({ field: { onChange, onBlur, value } }) => (
            <Input label="Contraseña" value={value} onChangeText={onChange} onBlur={onBlur} secureTextEntry={!showPassword} autoComplete="new-password" textContentType="newPassword" error={errors.password?.message} hint="8 caracteres, mayúscula, minúscula y número" rightIcon={<PasswordToggle visible={showPassword} onPress={() => setShowPassword((v) => !v)} />} />
          )} />
          <Controller control={control} name="confirm_password" render={({ field: { onChange, onBlur, value } }) => (
            <Input label="Confirma la contraseña" value={value} onChangeText={onChange} onBlur={onBlur} secureTextEntry={!showConfirmation} autoComplete="new-password" textContentType="newPassword" error={errors.confirm_password?.message} rightIcon={<PasswordToggle visible={showConfirmation} onPress={() => setShowConfirmation((v) => !v)} />} />
          )} />

          <Controller control={control} name="accepted_terms" render={({ field: { value, onChange } }) => (
            <CheckRow checked={value} onPress={() => onChange(!value)} label="Acepto los términos de uso y la política de privacidad." error={errors.accepted_terms?.message} />
          )} />
          <Link href={'/(auth)/legal' as never} className="text-primary font-semibold ml-9 -mt-2 mb-5">Leer términos y privacidad</Link>
          <Controller control={control} name="marketing_consent" render={({ field: { value, onChange } }) => (
            <CheckRow checked={value} onPress={() => onChange(!value)} label="Quiero recibir novedades y consejos. Es opcional." />
          )} />

          {errors.root?.message ? <Text accessibilityRole="alert" className="text-error bg-error/10 rounded-xl p-3 mb-4">{errors.root.message}</Text> : null}
          <Button label="Crear cuenta" size="lg" isLoading={isSubmitting} onPress={handleSubmit(submit)} className="w-full mt-2" />
          <View className="flex-row justify-center mt-7 mb-4"><Text className="text-muted-text">¿Ya tienes cuenta? </Text><Link href="/(auth)/login" className="text-primary font-semibold">Inicia sesión</Link></View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function Field({ control, name, label, error, inputProps = {} }: { control: any; name: keyof RegisterFormData; label: string; error?: string; inputProps?: Record<string, unknown> }) {
  return <Controller control={control} name={name} render={({ field: { onChange, onBlur, value } }) => <Input label={label} value={typeof value === 'string' ? value : ''} onChangeText={onChange} onBlur={onBlur} error={error} {...inputProps} />} />;
}

function PasswordToggle({ visible, onPress }: { visible: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'} hitSlop={12} onPress={onPress}>{visible ? <EyeOff size={20} color="#475569" /> : <Eye size={20} color="#475569" />}</Pressable>;
}

function RoleOption({ label, description, selected, icon, onPress }: { label: string; description: string; selected: boolean; icon: 'client' | 'professional'; onPress: () => void }) {
  const Icon = icon === 'client' ? UserRound : BriefcaseBusiness;
  return <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={onPress} className={`flex-1 min-h-28 rounded-xl border p-4 ${selected ? 'border-primary bg-primary/5' : 'border-border bg-surface'}`}><Icon size={22} color={selected ? '#4F46E5' : '#475569'} /><Text className={`font-semibold mt-3 ${selected ? 'text-primary' : 'text-text'}`}>{label}</Text><Text className="text-xs text-muted-text mt-1">{description}</Text></Pressable>;
}

function CheckRow({ checked, onPress, label, error }: { checked: boolean; onPress: () => void; label: string; error?: string }) {
  return <View className="mb-4"><Pressable accessibilityRole="checkbox" accessibilityState={{ checked }} onPress={onPress} className="flex-row items-start"><View className={`w-6 h-6 rounded-md border items-center justify-center mr-3 mt-0.5 ${checked ? 'bg-primary border-primary' : 'border-border bg-surface'}`}>{checked ? <Check size={16} color="white" /> : null}</View><Text className="flex-1 text-sm leading-5 text-text">{label}</Text></Pressable>{error ? <Text className="text-error text-sm ml-9 mt-1">{error}</Text> : null}</View>;
}
