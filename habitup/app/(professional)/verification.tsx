import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { useAuthStore } from '@/stores/authStore';
import { verificationService, type VerificationDocument } from '@/services/verification.service';
import { storageService } from '@/services/storage.service';
import { Screen, Card, Button, VerifiedBadge, LoadingState } from '@/components/ui';
import { ShieldCheck, Upload, FileText, CheckCircle2, XCircle, ChevronLeft } from 'lucide-react-native';

export default function VerificationScreen() {
  const router = useRouter();
  const { user, professionalProfile } = useAuthStore();
  const [documents, setDocuments] = useState<VerificationDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      const docs = await verificationService.getMyDocuments();
      setDocuments(docs);
    } catch (e) {
      console.error('Error loading documents:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (documentType: string) => {
    if (!professionalProfile || !user) return;

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const file = result.assets[0];
      const upload = await storageService.upload('verification-documents', user.id, {
        uri: file.uri,
        contentType: file.mimeType ?? 'application/pdf',
        name: file.name ?? `${documentType}.pdf`,
        size: file.size ?? 0,
      });

      const doc = await verificationService.uploadDocument(professionalProfile.id, documentType, upload.path);

      setDocuments((prev) => {
        const existing = prev.findIndex((d) => d.document_type === documentType);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = doc;
          return updated;
        }
        return [...prev, doc];
      });

      Alert.alert('Subido', 'Documento subido correctamente. Pendiente de revisión.');
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Error al subir documento');
    }
  };

  const getDocStatus = (status: string): 'approved' | 'pending' | 'rejected' => {
    if (status === 'aprobado') return 'approved';
    if (status === 'rechazado') return 'rejected';
    return 'pending';
  };

  const renderDocRow = (label: string, type: string) => {
    const doc = documents.find((d) => d.document_type === type);
    const docStatus = doc ? getDocStatus(doc.status) : null;
    const hasFile = !!doc?.file_path;

    return (
      <View className="flex-row items-center justify-between py-3 border-b border-border/30">
        <View className="flex-1 mr-4">
          <Text className="text-sm font-medium text-text">{label}</Text>
          {hasFile && docStatus && (
            <View className="flex-row items-center mt-1">
              {docStatus === 'approved' && <CheckCircle2 size={14} color="#10B981" />}
              {docStatus === 'pending' && <View className="w-3.5 h-3.5 rounded-full bg-warning/50" />}
              {docStatus === 'rejected' && <XCircle size={14} color="#EF4444" />}
              <Text className={`text-xs ml-1.5 ${
                docStatus === 'approved' ? 'text-success' :
                docStatus === 'rejected' ? 'text-error' :
                'text-warning'
              }`}>
                {docStatus === 'approved' ? 'Aprobado' :
                 docStatus === 'rejected' ? 'Rechazado' :
                 'Pendiente'}
              </Text>
            </View>
          )}
        </View>
        {!hasFile || docStatus === 'rejected' ? (
          <Button
            label="Subir"
            variant="outline"
            size="sm"
            leftIcon={<Upload size={14} />}
            onPress={() => handleUpload(type)}
          />
        ) : (
          <FileText size={18} color="#94A3B8" />
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <Screen safeArea={false} className="flex-1">
        <LoadingState />
      </Screen>
    );
  }

  const docTypes = [
    { key: 'nif_cif', label: 'NIF / CIF' },
    { key: 'business_license', label: 'Licencia / Alta de negocio' },
    { key: 'insurance', label: 'Seguro de responsabilidad civil' },
  ];

  return (
    <Screen safeArea={false} className="flex-1">
      <View className="bg-surface px-6 pt-16 pb-6 shadow-sm shadow-primary/10 border-b border-border/50 rounded-b-3xl z-10 flex-row items-center gap-4">
        <ChevronLeft size={24} color="#6366F1" onPress={() => router.back()} />
        <Text className="text-2xl font-extrabold text-text leading-tight">Verificación</Text>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="px-6 pt-6 pb-24" showsVerticalScrollIndicator={false}>
        <Card variant="elevated" className="p-5 mb-6">
          <View className="flex-row items-center mb-5 border-b border-border/50 pb-3">
            <ShieldCheck size={20} color="#10B981" />
            <Text className="text-lg font-bold text-text ml-2">Estado general</Text>
          </View>
          <View className="flex-row items-center justify-between">
            <Text className="text-sm text-text">Nivel de confianza</Text>
            <VerifiedBadge
              level={
                (professionalProfile?.nif_cif_verified && professionalProfile?.documents_verified)
                  ? 'verified'
                  : (professionalProfile?.nif_cif_verified || professionalProfile?.documents_verified)
                    ? 'partial' : 'none'
              }
            />
          </View>
        </Card>

        <Card variant="elevated" className="p-5 mb-6">
          <View className="flex-row items-center mb-5 border-b border-border/50 pb-3">
            <FileText size={20} color="#6366F1" />
            <Text className="text-lg font-bold text-text ml-2">Documentación</Text>
          </View>
          <Text className="text-xs text-muted-text mb-4">
            Sube tu documentación para que podamos verificar tu identidad como profesional.
            Los documentos serán revisados por nuestro equipo.
          </Text>
          {docTypes.map(({ key, label }) => renderDocRow(label, key))}
        </Card>

        <Button
          label="Volver al perfil"
          onPress={() => router.back()}
          variant="outline"
          size="lg"
        />
      </ScrollView>
    </Screen>
  );
}
