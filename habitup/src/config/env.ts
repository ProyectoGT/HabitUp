const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const stripePublishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';

if (!supabaseUrl) throw new Error('Missing env var: EXPO_PUBLIC_SUPABASE_URL');
if (!supabaseAnonKey) throw new Error('Missing env var: EXPO_PUBLIC_SUPABASE_ANON_KEY');

export const ENV = {
  SUPABASE_URL: supabaseUrl,
  SUPABASE_ANON_KEY: supabaseAnonKey,
  STRIPE_PUBLISHABLE_KEY: stripePublishableKey,
} as const;
