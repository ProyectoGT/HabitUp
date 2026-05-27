import { supabase } from './supabase';
import { readAsStringAsync, EncodingType } from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';

type FileInfo = {
  uri: string;
  contentType: string;
  name: string;
  size: number;
};

type UploadResult = {
  path: string;
  publicUrl: string | null;
  signedUrl: string | null;
};

type BucketConfig = {
  maxSize: number;
  allowedTypes: string[];
  isPublic: boolean;
};

const BUCKET_CONFIG: Record<string, BucketConfig> = {
  avatars: {
    maxSize: 5 * 1024 * 1024,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    isPublic: true,
  },
  'lead-images': {
    maxSize: 10 * 1024 * 1024,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    isPublic: true,
  },
  'portfolio-images': {
    maxSize: 10 * 1024 * 1024,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    isPublic: true,
  },
  'verification-documents': {
    maxSize: 20 * 1024 * 1024,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    isPublic: false,
  },
};

type BucketName = keyof typeof BUCKET_CONFIG;

function generateFilePath(ownerId: string, extension: string): string {
  const uuid = crypto.randomUUID();
  return `${ownerId}/${uuid}.${extension}`;
}

function getExtension(contentType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'application/pdf': 'pdf',
  };
  return map[contentType] ?? 'bin';
}

function validateFile(bucket: BucketName, fileInfo: FileInfo): void {
  const config = BUCKET_CONFIG[bucket];
  if (!config.allowedTypes.includes(fileInfo.contentType)) {
    throw new Error(
      `Tipo de archivo no permitido para ${bucket}. Permitidos: ${config.allowedTypes.join(', ')}`,
    );
  }
  if (fileInfo.size > config.maxSize) {
    const maxMb = config.maxSize / (1024 * 1024);
    throw new Error(`El archivo excede el límite de ${maxMb}MB para ${bucket}`);
  }
}

async function readFileAsArrayBuffer(uri: string): Promise<ArrayBuffer> {
  const base64 = await readAsStringAsync(uri, {
    encoding: EncodingType.Base64,
  });
  return decode(base64);
}

export const storageService = {
  BUCKETS: BUCKET_CONFIG,

  async upload(
    bucket: BucketName,
    ownerId: string,
    fileInfo: FileInfo,
  ): Promise<UploadResult> {
    validateFile(bucket, fileInfo);

    const ext = getExtension(fileInfo.contentType);
    const path = generateFilePath(ownerId, ext);

    const arrayBuffer = await readFileAsArrayBuffer(fileInfo.uri);

    const { error } = await supabase.storage
      .from(bucket)
      .upload(path, arrayBuffer, {
        contentType: fileInfo.contentType,
        upsert: true,
      });

    if (error) throw error;

    const config = BUCKET_CONFIG[bucket];
    const publicUrl = config.isPublic
      ? supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
      : null;

    let signedUrl: string | null = null;
    if (!config.isPublic) {
      const { data: signedData, error: signedError } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, 3600);

      if (signedError) throw signedError;
      signedUrl = signedData.signedUrl;
    }

    return { path, publicUrl, signedUrl };
  },

  async remove(bucket: BucketName, path: string): Promise<void> {
    const { error } = await supabase.storage.from(bucket).remove([path]);
    if (error) throw error;
  },

  async list(
    bucket: BucketName,
    prefix: string,
  ): Promise<
    { name: string; publicUrl: string | null; signedUrl: string | null }[]
  > {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(prefix, { sortBy: { column: 'created_at', order: 'desc' } });

    if (error) throw error;

    const config = BUCKET_CONFIG[bucket];
    return Promise.all(
      (data ?? []).map(async (file) => {
        const fullPath = prefix ? `${prefix}/${file.name}` : file.name;
        if (config.isPublic) {
          return {
            name: file.name,
            publicUrl: supabase.storage.from(bucket).getPublicUrl(fullPath).data.publicUrl,
            signedUrl: null,
          };
        }
        const { data: signedData } = await supabase.storage
          .from(bucket)
          .createSignedUrl(fullPath, 3600);

        return {
          name: file.name,
          publicUrl: null,
          signedUrl: signedData?.signedUrl ?? null,
        };
      }),
    );
  },

  getPublicUrl(bucket: BucketName, path: string): string | null {
    const config = BUCKET_CONFIG[bucket];
    if (!config.isPublic) return null;
    return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  },

  async createSignedUrl(
    bucket: BucketName,
    path: string,
    expiresIn = 3600,
  ): Promise<string> {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    if (error) throw error;
    return data.signedUrl;
  },
};
