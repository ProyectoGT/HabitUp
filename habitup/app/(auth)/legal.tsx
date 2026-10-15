import { ScrollView, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Screen } from '@/components/ui';

export default function LegalScreen() {
  const router = useRouter();
  return <Screen><ScrollView contentContainerClassName="px-5 py-8"><Text className="text-3xl font-bold text-text mb-3">Privacidad y condiciones</Text><Text className="text-muted-text leading-6 mb-7">Resumen funcional previo a la revisión jurídica y publicación de las versiones definitivas.</Text><Text className="text-xl font-bold text-text mb-2">Datos de la cuenta</Text><Text className="text-text leading-6 mb-6">Usamos tus datos de identificación y contacto para crear la cuenta, proteger el acceso y prestar las funciones de HabitUp. El consentimiento para comunicaciones comerciales es opcional y separado.</Text><Text className="text-xl font-bold text-text mb-2">Datos de solicitudes y proyectos</Text><Text className="text-text leading-6 mb-6">La información necesaria para conectar clientes y profesionales se comparte según el estado del trabajo. No deben publicarse teléfonos, correos ni direcciones exactas en una solicitud pública.</Text><Text className="text-xl font-bold text-text mb-2">Control de la cuenta</Text><Text className="text-text leading-6 mb-8">Puedes cerrar sesión o eliminar permanentemente tu cuenta desde Perfil. La eliminación no se puede deshacer y puede conservarse únicamente la información exigida legalmente.</Text><Button label="Volver al registro" variant="outline" onPress={() => router.back()} /></ScrollView></Screen>;
}
