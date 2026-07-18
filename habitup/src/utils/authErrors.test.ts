import { describe, expect, it } from '@jest/globals';
import { getAuthErrorMessage } from './authErrors';

describe('getAuthErrorMessage', () => {
  it('does not expose Supabase credential errors', () => expect(getAuthErrorMessage(new Error('Invalid login credentials'))).toBe('El correo o la contraseña no son correctos.'));
  it('provides an actionable offline message', () => expect(getAuthErrorMessage(new Error('Network request failed'))).toContain('Comprueba tu conexión'));
  it('uses the contextual fallback', () => expect(getAuthErrorMessage(new Error('database exploded'), 'No se pudo guardar.')).toBe('No se pudo guardar.'));
});
