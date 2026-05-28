function requireVar(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing env var: ${name}`);
  return val;
}

export const ENV = {
  get SUPABASE_URL() {
    return requireVar('EXPO_PUBLIC_SUPABASE_URL');
  },
  get SUPABASE_ANON_KEY() {
    return requireVar('EXPO_PUBLIC_SUPABASE_ANON_KEY');
  },
  STRIPE_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '',
} as const;
