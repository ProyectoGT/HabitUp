import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import { ENV } from '@/config/env';

const storage =
  Platform.OS === 'web'
    ? {
        getItem: (key: string) => Promise.resolve(localStorage.getItem(key)),
        setItem: (key: string, value: string) => {
          localStorage.setItem(key, value);
          return Promise.resolve();
        },
        removeItem: (key: string) => {
          localStorage.removeItem(key);
          return Promise.resolve();
        },
      }
    : (() => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const SecureStore = require('expo-secure-store');
        return {
          getItem: (key: string) => SecureStore.getItemAsync(key),
          setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
          removeItem: (key: string) => SecureStore.deleteItemAsync(key),
        };
      })();

export const supabase = createClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY, {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});
