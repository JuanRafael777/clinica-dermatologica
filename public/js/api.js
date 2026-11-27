// Express sirve public/ y la API desde el mismo origen.
async function iniciarSesion(email, password) {
  let respuesta;
  try {
    respuesta = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
  } catch {
    throw new Error('No se pudo conectar con la clínica. Inténtalo de nuevo.');
  }
  if ([401, 403].includes(respuesta.status)) {
    throw new Error('El correo o la contraseña son incorrectos.');
  }
  if (!respuesta.ok || !respuesta.headers.get('content-type')?.includes('application/json')) {
    throw new Error('El servicio de acceso no está disponible en este momento.');
  }
  const datos = await respuesta.json();
  if (typeof datos.token !== 'string' || !datos.token.trim()) {
    throw new Error('El servidor no confirmó la sesión. Vuelve a intentarlo.');
  }
  return datos.token;
}
