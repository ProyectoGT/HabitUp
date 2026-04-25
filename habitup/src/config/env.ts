const required = (key: string): string => {
  const value = process.env[key];
  if (!value) throw new Error(`Missing env var: ${key}`);
  return value;
};

export const ENV = {
  SUPABASE_URL: required('EXPO_PUBLIC_SUPABASE_URL'),
  SUPABASE_ANON_KEY: required('EXPO_PUBLIC_SUPABASE_ANON_KEY'),
  STRIPE_PUBLISHABLE_KEY: required('EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY'),
} as const;
