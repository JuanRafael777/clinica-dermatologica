const formulario = document.querySelector('#login');
const clave = formulario.elements.password;
const mostrar = document.querySelector('#reveal');
const mensaje = document.querySelector('#status');
const enviar = formulario.querySelector('[type="submit"]');

const cuentaDemo = { email: 'demo@dermica.example', password: 'Dermica2026' };

document.querySelector('#prueba').addEventListener('click', () => {
  formulario.elements.email.value = cuentaDemo.email;
  clave.value = cuentaDemo.password;
  mensaje.textContent = 'Cuenta de prueba lista. Pulsa Iniciar sesión.';
  enviar.focus();
});

mostrar.addEventListener('click', () => {
  const visible = clave.type === 'password';
  clave.type = visible ? 'text' : 'password';
  mostrar.textContent = visible ? 'Ocultar' : 'Mostrar';
});

formulario.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  enviar.disabled = true;
  mensaje.textContent = 'Verificando credenciales…';
  try {
    const email = formulario.elements.email.value.trim();
    if (email.toLowerCase() === cuentaDemo.email) {
      if (clave.value !== cuentaDemo.password) throw new Error('La contraseña de prueba es incorrecta.');
      location.replace('dashboard.html?modo=demo');
      return;
    }
    const token = await iniciarSesion(email, clave.value);
    localStorage.setItem('token', token);
    location.replace('dashboard.html');
  } catch (error) {
    mensaje.textContent = error.message;
  } finally {
    enviar.disabled = false;
  }
});
