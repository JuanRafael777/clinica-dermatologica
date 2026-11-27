// El modo de prueba guarda únicamente datos de demostración en este navegador.
const demo = new URLSearchParams(location.search).get('modo') === 'demo';
const claveDemo = 'dermica.demo.v1';
const modulos = ['pacientes', 'tratamientos', 'citas'];
const estados = ['Pendiente', 'Confirmada', 'Cancelada', 'Completada'];

function datosIniciales() {
  const hoy = new Date();
  const fecha = [hoy.getFullYear(), String(hoy.getMonth()+1).padStart(2,'0'), String(hoy.getDate()).padStart(2,'0')].join('-');
  return {
    pacientes: [
      {id:1, nombre:'Alba Rosario', cedula:'DEMO-001', telefono:'809-555-0101', correo:'alba@example.com', tipo_piel:'Mixta'},
      {id:2, nombre:'Luis Méndez', cedula:'DEMO-002', telefono:'809-555-0102', correo:'', tipo_piel:'Seca'}
    ],
    tratamientos: [
      {id:1, nombre:'Limpieza facial', descripcion:'Limpieza profunda de la piel', precio:1500, duracion_min:60},
      {id:2, nombre:'Peeling químico', descripcion:'Tratamiento para mejorar textura y manchas', precio:2500, duracion_min:45},
      {id:3, nombre:'Tratamiento para acné', descripcion:'Tratamiento dermatológico para el acné', precio:3000, duracion_min:60},
      {id:4, nombre:'Hidratación facial', descripcion:'Tratamiento de hidratación profunda', precio:1800, duracion_min:45}
    ],
    citas: [{id:1, paciente_id:1, tratamiento_id:1, fecha, hora:'09:00', estado:'Pendiente'}]
  };
}

function leerDemo() {
  const guardado = localStorage.getItem(claveDemo);
  if (guardado) return JSON.parse(guardado);
  const inicial = datosIniciales();
  localStorage.setItem(claveDemo, JSON.stringify(inicial));
  return inicial;
}

function guardarDemo(modulo, id, valores) {
  const datos = leerDemo();
  const lista = datos[modulo];
  const indice = lista.findIndex(fila => fila.id === id);
  if (id !== null && indice < 0) throw new Error('El registro ya no existe.');
  if (modulo === 'citas' && datos.consultas?.some(c => c.cita_id === id)) {
    throw new Error('Esta cita ya tiene una consulta registrada.');
  }
  if (valores === null) {
    const referencia = {pacientes:'paciente_id', tratamientos:'tratamiento_id'}[modulo];
    if (referencia && datos.citas.some(cita => cita[referencia] === id)) {
      throw new Error('Hay citas vinculadas a este registro. Revisa la agenda antes de eliminarlo.');
    }
    lista.splice(indice, 1);
  } else {
    if (modulo === 'pacientes' && lista.some(p => p.id !== id && p.cedula.toLowerCase() === valores.cedula.toLowerCase())) {
      throw new Error('Ya existe un paciente con esa cédula.');
    }
    if (modulo === 'citas') {
      if (!datos.pacientes.some(p => p.id === valores.paciente_id) || !datos.tratamientos.some(t => t.id === valores.tratamiento_id)) {
        throw new Error('El paciente o el tratamiento ya no está disponible.');
      }
      const ocupado = lista.some(c => c.id !== id && c.estado !== 'Cancelada' && c.fecha === valores.fecha && c.hora === valores.hora);
      if (ocupado && valores.estado !== 'Cancelada') throw new Error('Ese horario está ocupado. Elige otra fecha u hora.');
    }
    const registro = {...valores, id:id ?? Math.max(0, ...lista.map(fila => fila.id)) + 1};
    if (id === null) lista.push(registro);
    else lista[indice] = registro;
  }
  localStorage.setItem(claveDemo, JSON.stringify(datos));
}

async function solicitar(ruta, metodo = 'GET', valores, archivo = false) {
  const respuesta = await fetch('/api/' + ruta, {
    method: metodo,
    headers: {'Content-Type':'application/json', Authorization:'Bearer ' + localStorage.getItem('token')},
    body: valores == null ? undefined : JSON.stringify(valores)
  });
  if ([401,403].includes(respuesta.status)) {
    localStorage.removeItem('token');
    location.replace('login.html');
    throw new Error('Vuelve a iniciar sesión.');
  }
  if (!respuesta.ok) {
    const error = await respuesta.json().catch(() => ({}));
    throw new Error(error.mensaje || error.message || 'El servidor rechazó la operación. Revisa los datos.');
  }
  if (archivo) {
    const tipo = respuesta.headers.get('content-type') || '';
    if (!/pdf|excel|spreadsheet|octet-stream/i.test(tipo)) throw new Error('El servidor no devolvió el archivo solicitado.');
    return respuesta.blob();
  }
  if (metodo === 'GET') return respuesta.json();
}

async function cargarDatos() {
  if (demo) return leerDemo();
  const listas = await Promise.all(modulos.map(modulo => solicitar(modulo)));
  if (!listas.every(Array.isArray)) throw new Error('El servidor debe devolver una lista por módulo.');
  return Object.fromEntries(modulos.map((modulo, i) => [modulo, listas[i]]));
}

async function cambiarDatos(modulo, id, valores) {
  if (demo) {
    const guardar = () => guardarDemo(modulo, id, valores);
    return navigator.locks ? navigator.locks.request(claveDemo, guardar) : guardar();
  }
  const metodo = valores === null ? 'DELETE' : id === null ? 'POST' : 'PUT';
  return solicitar(id === null ? modulo : modulo + '/' + id, metodo, valores);
}
