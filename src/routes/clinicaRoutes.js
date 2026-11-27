const router = require('express').Router();
const db = require('../config/db');
const verificar = require('../middlewares/verifyToken');
const estados = ['Pendiente', 'Confirmada', 'Cancelada', 'Completada'];

function exigir(condicion, mensaje, status = 400) {
  if (!condicion) throw Object.assign(new Error(mensaje), { status });
}

function ruta(metodo, path, handler) {
  router[metodo](path, verificar, async (req, res) => {
    try {
      await handler(req, res);
    } catch (err) {
      if (res.headersSent) return res.end();
      const conflictos = {
        ER_DUP_ENTRY: 'Ese horario ya está ocupado.',
        ER_ROW_IS_REFERENCED_2: 'El registro tiene datos vinculados.',
        ER_NO_REFERENCED_ROW_2: 'El registro seleccionado ya no existe.'
      };
      if (conflictos[err.code]) return res.status(409).json({ mensaje: conflictos[err.code] });
      if (!err.status) console.error(err);
      res.status(err.status || 500).json({ mensaje: err.status ? err.message : 'Error al procesar la operación.' });
    }
  });
}

async function transaccion(operacion) {
  const con = await db.getConnection();
  try {
    await con.beginTransaction();
    const resultado = await operacion(con);
    await con.commit();
    return resultado;
  } catch (err) {
    await con.rollback();
    throw err;
  } finally {
    con.release();
  }
}

async function convertirImagen(base64) {
  if (base64 === undefined) return null;
  exigir(typeof base64 === 'string' && base64.length > 0 && base64.length <= 16*1024*1024,'Imagen vacía o demasiado grande.');
  const sharp = require('sharp');
  let bytes = Buffer.from(base64,'base64');
  const limites = {limitInputPixels:50000000};
  try {
    const meta = await sharp(bytes,limites).metadata();
    if (meta.format === 'heif' && meta.compression === 'hevc') {
      const convertir = require('heic-convert');
      bytes = Buffer.from(await convertir({buffer:bytes,format:'JPEG',quality:0.95}));
    }
    return await sharp(bytes,limites).rotate().resize(700,500,{fit:'cover'}).webp({quality:85}).toBuffer();
  } catch {
    exigir(false,'Imagen ilegible o formato no compatible. Prueba con una copia JPG o PNG.');
  }
}

function tratamiento(body) {
  const {nombre, descripcion, precio, duracion_min} = body;
  exigir(typeof nombre === 'string' && nombre.trim() && nombre.trim().length <= 100, 'Revisa el nombre del tratamiento.');
  exigir(/^\d{1,8}(\.\d{1,2})?$/.test(String(precio)), 'Revisa el precio.');
  exigir(Number.isInteger(Number(duracion_min)) && Number(duracion_min) > 0 && Number(duracion_min) <= 2147483647, 'Revisa la duración.');
  return [nombre.trim(), descripcion || '', precio, duracion_min];
}

ruta('get','/tratamientos', async (req,res) => {
  const [filas] = await db.query('SELECT id,nombre,descripcion,precio,duracion_min FROM tratamientos ORDER BY nombre');
  res.json(filas);
});
ruta('post','/tratamientos', async (req,res) => {
  const valores = tratamiento(req.body);
  const foto = await convertirImagen(req.body.imagen);
  const [r] = await db.execute('INSERT INTO tratamientos(nombre,descripcion,precio,duracion_min,imagen_webp) VALUES(?,?,?,?,?)',[...valores,foto]);
  res.status(201).json({id:r.insertId});
});
ruta('put','/tratamientos/:id', async (req,res) => {
  const valores = tratamiento(req.body);
  const foto = await convertirImagen(req.body.imagen);
  const [r] = await db.execute('UPDATE tratamientos SET nombre=?,descripcion=?,precio=?,duracion_min=?,imagen_webp=COALESCE(?,imagen_webp) WHERE id=?',[...valores,foto,req.params.id]);
  exigir(r.affectedRows,'Tratamiento no encontrado.',404);
  res.sendStatus(204);
});
ruta('delete','/tratamientos/:id', async (req,res) => {
  const [r] = await db.execute('DELETE FROM tratamientos WHERE id=?',[req.params.id]);
  exigir(r.affectedRows,'Tratamiento no encontrado.',404);
  res.sendStatus(204);
});

function valoresCita(body) {
  const {paciente_id,tratamiento_id,fecha,hora,estado='Pendiente'} = body;
  exigir([paciente_id,tratamiento_id].every(v => Number.isSafeInteger(Number(v)) && Number(v)>0),'Selecciona paciente y tratamiento.');
  exigir(/^\d{4}-\d{2}-\d{2}$/.test(fecha) && !isNaN(Date.parse(fecha)) && new Date(fecha).toISOString().slice(0,10)===fecha,'Fecha inválida.');
  exigir(/^([01]\d|2[0-3]):[0-5]\d(:00)?$/.test(hora),'Hora inválida.');
  exigir(estados.includes(estado),'Estado inválido.');
  return [paciente_id,tratamiento_id,fecha,hora,estado];
}
ruta('get','/citas', async (req,res) => {
  const [filas] = await db.query("SELECT id,paciente_id,tratamiento_id,DATE_FORMAT(fecha,'%Y-%m-%d') fecha,hora,estado FROM citas ORDER BY fecha,hora");
  res.json(filas);
});
ruta('post','/citas', async (req,res) => {
  const [r] = await db.execute('INSERT INTO citas(paciente_id,tratamiento_id,fecha,hora,estado) VALUES(?,?,?,?,?)',valoresCita(req.body));
  res.status(201).json({id:r.insertId});
});
async function bloquearCita(con,id) {
  const [[cita]] = await con.execute('SELECT * FROM citas WHERE id=? FOR UPDATE',[id]);
  exigir(cita,'Cita no encontrada.',404);
  const [consultas] = await con.execute('SELECT id FROM consultas WHERE cita_id=?',[id]);
  exigir(!consultas.length,'La cita ya tiene una consulta registrada.',409);
  return cita;
}
ruta('put','/citas/:id', async (req,res) => {
  const valores = valoresCita(req.body);
  await transaccion(async con => {
    await bloquearCita(con,req.params.id);
    await con.execute('UPDATE citas SET paciente_id=?,tratamiento_id=?,fecha=?,hora=?,estado=? WHERE id=?',[...valores,req.params.id]);
  });
  res.sendStatus(204);
});
ruta('delete','/citas/:id', async (req,res) => {
  await transaccion(async con => {
    await bloquearCita(con,req.params.id);
    await con.execute('DELETE FROM citas WHERE id=?',[req.params.id]);
  });
  res.sendStatus(204);
});
ruta('get','/consultas', async (req,res) => {
  const [filas] = await db.query('SELECT * FROM consultas ORDER BY id DESC');
  res.json(filas);
});
ruta('post','/consultas', async (req,res) => {
  const {cita_id,diagnostico,receta,total} = req.body;
  exigir(cita_id && typeof diagnostico === 'string' && diagnostico.trim(),'Selecciona una cita y escribe el diagnóstico.');
  const resultado = await transaccion(async con => {
    const cita = await bloquearCita(con,cita_id);
    exigir(cita.estado === 'Confirmada','La cita debe estar confirmada.',409);
    const [[servicio]] = await con.execute('SELECT precio FROM tratamientos WHERE id=? FOR UPDATE',[cita.tratamiento_id]);
    exigir(Number(servicio.precio) === Number(total),'El precio cambió. Recarga el panel.',409);
    const [r] = await con.execute('INSERT INTO consultas(cita_id,diagnostico,receta,total) VALUES(?,?,?,?)',[cita_id,diagnostico.trim(),receta || '',servicio.precio]);
    await con.execute("UPDATE citas SET estado='Completada' WHERE id=?",[cita_id]);
    return {id:r.insertId,total:servicio.precio};
  });
  res.status(201).json(resultado);
});

async function agenda() {
  const [filas] = await db.query("SELECT DATE_FORMAT(c.fecha,'%Y-%m-%d') fecha,LEFT(c.hora,5) hora,p.nombre paciente,t.nombre tratamiento,c.estado FROM citas c JOIN pacientes p ON p.id=c.paciente_id JOIN tratamientos t ON t.id=c.tratamiento_id ORDER BY c.fecha,c.hora");
  return filas;
}
ruta('get','/reportes/citas-pdf', async (req,res) => {
  const PDF = require('pdfkit');
  const filas = await agenda();
  const pdf = new PDF({margin:45});
  res.attachment('Citas-Dermica.pdf');
  pdf.pipe(res);
  pdf.fontSize(19).text('Dérmica | Reporte de citas').moveDown();
  pdf.fontSize(11);
  if (!filas.length) pdf.text('No hay citas registradas.');
  for (const f of filas) {
    pdf.text(f.fecha + '   ' + f.hora + '   |   ' + f.estado);
    pdf.text(f.paciente + ' — ' + f.tratamiento).moveDown();
  }
  pdf.end();
});
ruta('get','/reportes/citas-excel', async (req,res) => {
  const Excel = require('exceljs');
  const libro = new Excel.Workbook();
  const hoja = libro.addWorksheet('Citas');
  hoja.columns = ['Fecha','Hora','Paciente','Tratamiento','Estado'].map(header => ({header,key:header.toLowerCase(),width:24}));
  hoja.addRows(await agenda());
  hoja.getRow(1).font = {bold:true};
  const archivo = await libro.xlsx.writeBuffer();
  res.attachment('Citas-Dermica.xlsx').send(Buffer.from(archivo));
});
module.exports = router;
