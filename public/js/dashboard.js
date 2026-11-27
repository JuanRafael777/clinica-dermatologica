const $ = selector => document.querySelector(selector);
const dinero = new Intl.NumberFormat('en-US', {minimumFractionDigits:2, maximumFractionDigits:2});
const campos = {
  pacientes: [
    ['nombre','Nombre','text',{required:true,maxLength:100}], ['cedula','Cédula','text',{required:true,maxLength:20}],
    ['telefono','Teléfono','tel',{required:true,maxLength:20}], ['correo','Correo','email',{maxLength:100}],
    ['tipo_piel','Tipo de piel','text',{maxLength:50}]
  ],
  tratamientos: [
    ['nombre','Nombre','text',{required:true,maxLength:100}], ['descripcion','Descripción','textarea',{}],
    ['precio','Precio (RD$)','number',{required:true,min:0,max:99999999.99,step:0.01}],
    ['duracion_min','Duración (min)','number',{required:true,min:1,max:2147483647,step:1}]
  ],
  citas: [
    ['paciente_id','Paciente','select',{required:true}], ['tratamiento_id','Tratamiento','select',{required:true}],
    ['fecha','Fecha','date',{required:true}], ['hora','Hora','time',{required:true}], ['estado','Estado','select',{required:true}]
  ]
};
const singular = {pacientes:'paciente', tratamientos:'tratamiento', citas:'cita'};
const pistas = {pacientes:'Buscar nombre, cédula o teléfono', tratamientos:'Buscar tratamiento', citas:'Buscar paciente, fecha o estado'};
let modulo = 'pacientes', datos, idActual, eliminar;
const dialogo = $('#editor'), formulario = $('#registro');

function elemento(tipo, texto) {
  const nodo = document.createElement(tipo);
  nodo.textContent = texto;
  return nodo;
}

function valorVisible(fila, clave) {
  const valor = fila[clave];
  if (clave === 'paciente_id' || clave === 'tratamiento_id') {
    const lista = clave === 'paciente_id' ? datos.pacientes : datos.tratamientos;
    return lista.find(r => Number(r.id) === Number(valor))?.nombre ?? 'Sin referencia';
  }
  if (clave === 'precio') return 'RD$' + dinero.format(valor);
  if (clave === 'fecha') return String(valor).slice(0,10);
  if (clave === 'hora') return String(valor).slice(0,5);
  return String(valor ?? '');
}

function normalizar(texto) {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
}

function dibujar() {
  const titulo = modulo[0].toUpperCase() + modulo.slice(1);
  $('#titulo').textContent = $('#leyenda').textContent = titulo;
  $('#nuevo').textContent = 'Agregar ' + singular[modulo];
  $('#buscar').placeholder = pistas[modulo];
  document.querySelectorAll('[data-modulo]').forEach(boton => {
    boton.setAttribute('aria-current', boton.dataset.modulo === modulo ? 'page' : 'false');
  });
  const titulos = [...campos[modulo].map(c => c[1]), 'Acciones'];
  $('#columnas').replaceChildren(...titulos.map(t => elemento('th',t)));
  const requeridos = modulo === 'citas' ? modulos : [modulo];
  const falta = requeridos.find(nombre => datos.errores?.[nombre]);
  $('#nuevo').disabled = Boolean(falta);
  $('#reintentar').hidden = !falta;
  $('#aviso').textContent = falta ? 'No se pudo cargar ' + falta + ': ' + datos.errores[falta] : '';
  if (falta) {
    $('#filas').replaceChildren();
    $('#cantidad').textContent = '';
    $('#vacio').hidden = true;
    return;
  }
  const termino = normalizar($('#buscar').value.trim());
  const filas = datos[modulo].filter(f => campos[modulo].some(([clave]) => normalizar(valorVisible(f,clave)).includes(termino)));
  if (modulo === 'citas') filas.sort((a,b) => (a.fecha+a.hora).localeCompare(b.fecha+b.hora));
  $('#cantidad').textContent = filas.length + (filas.length === 1 ? ' registro' : ' registros');
  $('#vacio').hidden = filas.length > 0;
  $('#vacio').textContent = termino ? 'Ningún registro coincide con tu búsqueda.' : 'Todavía no hay registros.';
  $('#filas').replaceChildren();
  for (const fila of filas) {
    const tr = $('#filas').insertRow();
    campos[modulo].forEach(([clave,etiqueta]) => {
      const td = tr.insertCell();
      td.dataset.label = etiqueta;
      const valor = valorVisible(fila,clave);
      if (clave === 'estado') {
        const pill = elemento('span',valor);
        pill.className = 'pill';
        pill.dataset.estado = valor;
        td.append(pill);
      } else td.textContent = valor || '—';
    });
    const acciones = tr.insertCell();
    acciones.dataset.label = 'Acciones';
    const grupo = elemento('div','');
    for (const accion of ['Editar','Eliminar']) {
      const boton = elemento('button',accion);
      boton.dataset.accion = accion.toLowerCase();
      boton.addEventListener('click', () => abrir(fila, accion === 'Eliminar'));
      grupo.append(boton);
    }
    acciones.append(grupo);
  }
}

function abrir(fila = {}, borrar = false) {
  if (modulo === 'citas' && !borrar && (!datos.pacientes.length || !datos.tratamientos.length)) {
    $('#aviso').textContent = 'Registra al menos un paciente y un tratamiento antes de agendar.';
    return;
  }
  idActual = fila.id ?? null;
  eliminar = borrar;
  $('#accion').textContent = (borrar ? 'Eliminar ' : idActual === null ? 'Agregar ' : 'Editar ') + singular[modulo];
  $('#guardar').textContent = borrar ? 'Eliminar' : 'Guardar';
  $('#error').textContent = '';
  $('#campos').replaceChildren();
  if (borrar) {
    const nombre = fila.nombre || valorVisible(fila,'paciente_id') + ' · ' + valorVisible(fila,'fecha') + ' ' + valorVisible(fila,'hora');
    $('#campos').append(elemento('p','¿Eliminar el registro de ' + nombre + '?'));
  } else for (const [clave,titulo,tipo,atributos] of campos[modulo]) {
    const etiqueta = elemento('label',titulo);
    const control = document.createElement(['select','textarea'].includes(tipo) ? tipo : 'input');
    if (control.tagName === 'INPUT') control.type = tipo;
    Object.assign(control,atributos,{name:clave});
    if (tipo === 'select') {
      if (clave === 'estado') estados.forEach(e => control.add(new Option(e,e)));
      else {
        control.add(new Option('Selecciona una opción',''));
        const lista = clave === 'paciente_id' ? datos.pacientes : datos.tratamientos;
        lista.forEach(r => control.add(new Option(r.nombre,r.id)));
      }
    }
    if (fila[clave] != null) control.value = ['fecha','hora'].includes(clave) ? valorVisible(fila,clave) : fila[clave];
    etiqueta.append(control);
    $('#campos').append(etiqueta);
  }
  if (!borrar && modulo === 'tratamientos' && !demo) {
    const etiqueta = elemento('label', 'Imagen del tratamiento (opcional)');
    const archivo = document.createElement('input');
    archivo.type = 'file';
    archivo.id = 'foto-tratamiento';
    archivo.accept = 'image/*,.heic,.heif,.tif,.tiff,.avif,.ico';
    etiqueta.append(archivo);
    $('#campos').append(etiqueta);
  }
  dialogo.showModal();
}

async function actualizar() {
  try {
    datos = await cargarDatos();
    dibujar();
    return !$('#nuevo').disabled;
  } catch {
    datos = null;
    $('#filas').replaceChildren();
    $('#cantidad').textContent = '';
    $('#vacio').hidden = true;
    $('#nuevo').disabled = true;
    $('#aviso').textContent = 'No se pudieron cargar los registros. Revisa la conexión o el almacenamiento del navegador.';
    $('#reintentar').hidden = false;
    return false;
  }
}

formulario.addEventListener('submit', async evento => {
  evento.preventDefault();
  let valores = null;
  if (!eliminar) {
    valores = {};
    for (const control of $('#campos').querySelectorAll('[name]')) {
      const texto = control.value.trim();
      if (control.required && !texto) {
        $('#error').textContent = 'Completa el campo ' + control.labels[0].firstChild.textContent + '.';
        control.focus();
        return;
      }
      valores[control.name] = control.type === 'number' || control.name.endsWith('_id') ? Number(texto) : texto;
    }
  }
  $('#guardar').disabled = true;
  try {
    const foto = document.querySelector('#foto-tratamiento')?.files[0];
    if (foto) valores.imagen = await leerImagen(foto);
    await cambiarDatos(modulo,idActual,valores);
    dialogo.close();
    if (await actualizar()) $('#aviso').textContent = eliminar ? 'Registro eliminado.' : 'Cambios guardados.';
  } catch (error) {
    $('#error').textContent = error.message;
  } finally {
    $('#guardar').disabled = false;
  }
});

$('.modules').addEventListener('click', evento => {
  if (!datos || !evento.target.dataset.modulo) return;
  modulo = evento.target.dataset.modulo;
  $('#buscar').value = $('#aviso').textContent = '';
  dibujar();
});
$('#buscar').addEventListener('input', () => { if (datos) dibujar(); });
$('#nuevo').addEventListener('click', () => abrir());
$('#volver').addEventListener('click', () => dialogo.close());
$('#reintentar').addEventListener('click', () => { $('#aviso').textContent = ''; actualizar(); });
$('#salir').addEventListener('click', () => {
  if (!demo) localStorage.removeItem('token');
  location.replace('login.html');
});
if (demo || localStorage.getItem('token')) {
  $('#modo').textContent = demo ? '' : 'Acceso del personal';
  actualizar();
} else location.replace('login.html');

// Los formatos que reconoce el navegador se reducen antes de enviarlos.
async function leerImagen(archivo) {
  if (archivo.size > 12 * 1024 * 1024) throw new Error('Elige una imagen de hasta 12 MB.');
  let fuente = archivo;
  let mapa;
  try {
    mapa = await createImageBitmap(archivo);
    const lienzo = document.createElement('canvas');
    lienzo.width = 700;
    lienzo.height = 500;
    const escala = Math.max(700 / mapa.width, 500 / mapa.height);
    const ancho = 700 / escala, alto = 500 / escala;
    lienzo.getContext('2d').drawImage(mapa, (mapa.width-ancho)/2, (mapa.height-alto)/2, ancho, alto, 0,0,700,500);
    fuente = await new Promise(resolve => lienzo.toBlob(resolve, 'image/webp', 0.92)) || archivo;
  } catch {
    // TIFF y HEIC pueden requerir el decodificador del servidor.
  } finally {
    mapa?.close();
  }
  return new Promise((resolve,reject) => {
    const lector = new FileReader();
    lector.onload = () => resolve(lector.result.split(',')[1]);
    lector.onerror = () => reject(new Error('No se pudo leer la imagen.'));
    lector.readAsDataURL(fuente);
  });
}
