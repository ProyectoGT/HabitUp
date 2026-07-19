import { describe, expect, it } from '@jest/globals';
import { loginSchema, registerSchema } from './validators';

const validRegistration = {
  first_name: 'Ana', last_name: 'García Ruiz', email: 'ana@example.com', phone: '612345678',
  locality: 'Madrid', postal_code: '28001', password: 'Habitup2026', confirm_password: 'Habitup2026',
  user_type: 'cliente' as const, accepted_terms: true, marketing_consent: false,
};

describe('registerSchema', () => {
  it('accepts a complete valid registration', () => expect(registerSchema.safeParse(validRegistration).success).toBe(true));
  it('rejects different passwords', () => {
    const result = registerSchema.safeParse({ ...validRegistration, confirm_password: 'Different2026' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues.some((issue) => issue.path[0] === 'confirm_password')).toBe(true);
  });
  it('requires legal acceptance', () => expect(registerSchema.safeParse({ ...validRegistration, accepted_terms: false }).success).toBe(false));
  it('rejects weak passwords and invalid postal codes', () => {
    expect(registerSchema.safeParse({ ...validRegistration, password: 'password', confirm_password: 'password' }).success).toBe(false);
    expect(registerSchema.safeParse({ ...validRegistration, postal_code: '2800' }).success).toBe(false);
  });
});

describe('loginSchema', () => {
  it('normalizes email casing and whitespace', () => expect(loginSchema.parse({ email: ' ANA@EXAMPLE.COM ', password: 'secret' }).email).toBe('ana@example.com'));
});
