import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/database';

type User = Database['public']['Tables']['users']['Row'];

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const location = useLocation();

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        setAuthorized(false);
        return;
      }

      const { data: user } = await supabase
        .from('users')
        .select('user_type')
        .eq('id', session.user.id)
        .single();

      if ((user as unknown as User)?.user_type === 'admin') {
        setAuthorized(true);
      } else {
        setAuthorized(false);
      }
    });
  }, []);

  if (authorized === null) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="text-sm text-slate-500">Verificando acceso...</p>
        </div>
      </div>
    );
  }

  if (!authorized) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
