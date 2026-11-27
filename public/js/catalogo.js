// Fotografías originales del catálogo inicial.
const originales = new Map([
  [1, ['limpieza facial','limpieza']], [2, ['peeling químico','peeling']],
  [3, ['tratamiento para acné','acne']], [4, ['hidratación facial','hidratacion']]
]);
const precio = new Intl.NumberFormat('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
const catalogo = document.querySelector('#catalogo');
const estado = document.querySelector('#estado-catalogo');
const plantilla = document.querySelector('#tarjeta');

function tarjeta(servicio) {
  const item = plantilla.content.cloneNode(true);
  const imagen = item.querySelector('img');
  const original = originales.get(Number(servicio.id));
  if (Number(servicio.con_foto) === 1) {
    imagen.src = '/api/catalogo/' + servicio.id + '/imagen';
  } else if (original && original[0] === servicio.nombre.trim().toLowerCase()) {
    imagen.src = 'img/' + original[1] + '.webp';
  } else {
    imagen.remove();
  }
  item.querySelector('h3').textContent = servicio.nombre;
  item.querySelector('p').textContent = servicio.descripcion || '';
  item.querySelector('strong').textContent = 'RD$' + precio.format(servicio.precio);
  item.querySelector('span').textContent = servicio.duracion_min + ' min';
  return item;
}

let solicitud = 0;
async function cargarCatalogo() {
  const actual = ++solicitud;
  try {
    const respuesta = await fetch('/api/catalogo', {cache: 'no-store'});
    if (!respuesta.ok) throw new Error();
    const servicios = await respuesta.json();
    if (actual !== solicitud) return;
    catalogo.replaceChildren(...servicios.map(tarjeta));
    estado.textContent = servicios.length ? '' : 'Todavía no hay tratamientos disponibles.';
    estado.hidden = servicios.length > 0;
  } catch {
    if (actual !== solicitud) return;
    catalogo.replaceChildren();
    estado.hidden = false;
    estado.textContent = 'No se pudo cargar el catálogo. Recarga la página para volver a intentarlo.';
  }
}
window.addEventListener('pageshow', cargarCatalogo);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) cargarCatalogo();
});
