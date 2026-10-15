const AUTH_ERROR_COPY: [string, string][] = [
  ['invalid login credentials', 'El correo o la contraseña no son correctos.'],
  ['email not confirmed', 'Confirma tu correo antes de iniciar sesión.'],
  ['user already registered', 'Ya existe una cuenta con este correo.'],
  ['already registered', 'Ya existe una cuenta con este correo.'],
  ['password should be', 'La contraseña no cumple los requisitos de seguridad.'],
  ['rate limit', 'Has realizado demasiados intentos. Espera unos minutos y vuelve a probar.'],
  ['network request failed', 'No hemos podido conectar. Comprueba tu conexión y vuelve a intentarlo.'],
  ['fetch failed', 'No hemos podido conectar. Comprueba tu conexión y vuelve a intentarlo.'],
  ['expired', 'Este enlace ha caducado. Solicita uno nuevo.'],
];

export function getAuthErrorMessage(error: unknown, fallback = 'No hemos podido completar la operación.') {
  const raw = error instanceof Error ? error.message : '';
  const normalized = raw.toLowerCase();
  const match = AUTH_ERROR_COPY.find(([needle]) => normalized.includes(needle));
  return match?.[1] ?? fallback;
}
