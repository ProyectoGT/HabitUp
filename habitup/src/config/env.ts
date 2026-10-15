export const ENV = {
  get SUPABASE_URL() {
    const val = process.env.EXPO_PUBLIC_SUPABASE_URL;
    if (!val) throw new Error('Missing env var: EXPO_PUBLIC_SUPABASE_URL');
    return val;
  },
  get SUPABASE_ANON_KEY() {
    const val = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    if (!val) throw new Error('Missing env var: EXPO_PUBLIC_SUPABASE_ANON_KEY');
    return val;
  },
  STRIPE_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '',
  PROJECT_ID: process.env.EXPO_PUBLIC_PROJECT_ID ?? '',
} as const;
