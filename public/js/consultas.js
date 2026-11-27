const moneda = valor => 'RD$' + Number(valor).toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2});
const turno = $('#turno');
const alta = $('#facturar');
const vistaPrincipal = $('.workspace');

function citaElegida() {
  return datos.citas.find(c => Number(c.id) === Number(turno.value));
}

function mostrarImporte() {
  const cita = citaElegida();
  $('#emitir').disabled = !cita;
  const resumen = $('#resumen');
  resumen.replaceChildren();
  if (!cita) {
    resumen.textContent = turno.options.length > 1 ? 'Selecciona una cita para ver el importe.' : 'Confirma una cita en la agenda para registrar su consulta.';
    return;
  }
  const servicio = datos.tratamientos.find(t => Number(t.id) === Number(cita.tratamiento_id));
  resumen.append(elemento('p','Paciente: ' + valorVisible(cita,'paciente_id')),
    elemento('p','Tratamiento: ' + servicio.nombre), elemento('strong','Total: ' + moneda(servicio.precio)));
}

function listarConfirmadas() {
  turno.replaceChildren(new Option('Selecciona una cita',''));
  for (const cita of datos.citas.filter(c => c.estado === 'Confirmada')) {
    const texto = [valorVisible(cita,'fecha'), valorVisible(cita,'hora'), valorVisible(cita,'paciente_id')].join(' · ');
    turno.add(new Option(texto,cita.id));
  }
  mostrarImporte();
}

$('.modules').addEventListener('click', evento => {
  const boton = evento.target.closest('button');
  if (!boton || !datos) return;
  const vista = boton.dataset.vista;
  vistaPrincipal.hidden = Boolean(vista);
  $('#consulta').hidden = vista !== 'consulta';
  $('#reportes').hidden = vista !== 'reportes';
  document.querySelectorAll('.modules button').forEach(b => b.setAttribute('aria-current', b === boton ? 'page' : 'false'));
  if (vista === 'consulta') { alta.reset(); $('#resultado').textContent = ''; listarConfirmadas(); }
});
turno.addEventListener('change', mostrarImporte);

function registrarDemo(consulta) {
  const db = leerDemo();
  const cita = db.citas.find(c => c.id === consulta.cita_id);
  if (cita?.estado !== 'Confirmada') throw new Error('La cita ya no está confirmada. Revisa la agenda.');
  const servicio = db.tratamientos.find(t => t.id === cita.tratamiento_id);
  if (Number(servicio.precio) !== consulta.total) throw new Error('El precio cambió. Recarga el panel para consultar el importe actual.');
  db.consultas ??= [];
  db.consultas.push({...consulta, id:db.consultas.length + 1, fecha_registro:new Date().toISOString()});
  cita.estado = 'Completada';
  localStorage.setItem(claveDemo, JSON.stringify(db));
}

alta.addEventListener('submit', async evento => {
  evento.preventDefault();
  const cita = citaElegida();
  const diagnostico = $('#diagnostico').value.trim();
  if (!cita || !diagnostico) { $('#resultado').textContent = 'Selecciona una cita e introduce el diagnóstico.'; return; }
  const servicio = datos.tratamientos.find(t => Number(t.id) === Number(cita.tratamiento_id));
  const consulta = {cita_id:Number(cita.id), diagnostico, receta:$('#receta').value.trim(), total:Number(servicio.precio)};
  $('#emitir').disabled = true;
  try {
    if (!demo) await solicitar('consultas','POST',consulta);
    else if (navigator.locks) await navigator.locks.request(claveDemo, () => registrarDemo(consulta));
    else registrarDemo(consulta);
  } catch (error) {
    $('#resultado').textContent = error.message;
    $('#emitir').disabled = false;
    return;
  }
  alta.reset();
  $('#resultado').textContent = 'Consulta registrada · ' + valorVisible(cita,'paciente_id') + ' · Total: ' + moneda(consulta.total);
  if (await actualizar()) listarConfirmadas();
  else { vistaPrincipal.hidden = false; $('#consulta').hidden = true; $('#aviso').textContent = 'Consulta registrada. Vuelve a cargar la agenda.'; }
});

// Libro XML de Excel 2003. Cada celda se escribe explícitamente como texto.
function excelDemo(db) {
  const escape = texto => String(texto).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
  const filas = [['Paciente','Tratamiento','Fecha','Hora','Estado']];
  for (const c of db.citas) filas.push([db.pacientes.find(p => p.id === c.paciente_id)?.nombre,
    db.tratamientos.find(t => t.id === c.tratamiento_id)?.nombre,c.fecha,c.hora,c.estado]);
  const tabla = filas.map(f => '<Row>' + f.map(v => '<Cell><Data ss:Type="String">' + escape(v) + '</Data></Cell>').join('') + '</Row>').join('');
  const ns = 'urn:schemas-microsoft-com:office:spreadsheet';
  return new Blob(['<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?>',
    '<Workbook xmlns="'+ns+'" xmlns:ss="'+ns+'"><Worksheet ss:Name="Citas"><Table>',tabla,
    '</Table></Worksheet></Workbook>'], {type:'application/vnd.ms-excel'});
}
function pdfDemo(db) {
  const pdf = new window.jspdf.jsPDF();
  let y;
  function pagina() {
    pdf.setFontSize(18);
    pdf.text('Dérmica | Reporte de citas', 16, 22);
    pdf.setFontSize(11);
    pdf.text('Agenda de demostración', 16, 30);
    y = 45;
  }
  pagina();
  if (!db.citas.length) pdf.text('No hay citas registradas.', 16, y);
  for (const cita of db.citas) {
    const nombre = db.pacientes.find(p => p.id === cita.paciente_id)?.nombre || 'Sin registrar';
    const tratamiento = db.tratamientos.find(t => t.id === cita.tratamiento_id)?.nombre || 'Sin registrar';
    const lineas = pdf.splitTextToSize([cita.fecha + '  |  ' + cita.hora + '  |  ' + cita.estado, nombre, tratamiento].join('\n'), 175);
    if (y + lineas.length * 6 > 280) { pdf.addPage(); pagina(); }
    for (const linea of lineas) { pdf.text(linea, 16, y); y += 6; }
    y += 4;
  }
  return pdf.output('blob');
}
if (demo) $('#formato').replaceChildren(new Option('PDF','pdf'),new Option('Excel (libro XML)','excel'));
$('#exportar').addEventListener('submit', async evento => {
  evento.preventDefault();
  const boton = evento.submitter || $('#exportar button');
  boton.disabled = true;
  const formato = $('#formato').value;
  try {
    const generar = formato === 'pdf' ? pdfDemo : excelDemo;
    const archivo = demo ? generar(leerDemo()) : await solicitar('reportes/citas-' + formato,'GET',undefined,true);
    const enlace = document.createElement('a');
    enlace.href = URL.createObjectURL(archivo);
    enlace.download = 'Citas-Dermica.' + (formato === 'pdf' ? 'pdf' : demo ? 'xml' : 'xlsx');
    document.body.append(enlace);
    enlace.click();
    enlace.remove();
    setTimeout(() => URL.revokeObjectURL(enlace.href), 60000);
    $('#descarga').textContent = 'Descarga iniciada.';
  } catch (error) { $('#descarga').textContent = 'No se pudo descargar el reporte. ' + error.message; }
  finally { boton.disabled = false; }
});
