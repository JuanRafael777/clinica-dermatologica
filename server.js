const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const pool = require('./src/config/db');
const authRoutes = require('./src/routes/authRoutes');
const pacientesRoutes = require('./src/routes/pacientesRoutes');

const app = express();

app.use(cors());
const verificarImagen = require('./src/middlewares/verifyToken');
app.post('/api/tratamientos', verificarImagen, express.json({limit:'17mb'}));
app.put('/api/tratamientos/:id', verificarImagen, express.json({limit:'17mb'}));
app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', authRoutes);
app.use('/api/pacientes', pacientesRoutes);
app.use('/api', require('./src/routes/clinicaRoutes'));

app.get('/api/catalogo', async (req, res) => {
    try {
        const [filas] = await pool.query('SELECT id, imagen_webp IS NOT NULL AS con_foto, nombre, descripcion, precio, duracion_min FROM tratamientos ORDER BY id');
        res.set('Cache-Control', 'no-store').json(filas);
    } catch (error) {
        console.error(error);
        res.status(500).json({mensaje: 'No se pudo cargar el catálogo.'});
    }
});

app.get('/api/catalogo/:id/imagen', async (req,res) => {
    try {
        const [[fila]] = await pool.execute('SELECT imagen_webp FROM tratamientos WHERE id=?',[req.params.id]);
        if (!fila?.imagen_webp) return res.sendStatus(404);
        res.set('Cache-Control','no-store').type('image/webp').send(fila.imagen_webp);
    } catch (error) {
        res.sendStatus(500);
    }
});

app.get('/api', (req, res) => {
    res.json({
        mensaje: 'API Clínica Dermatológica funcionando'
    });
});

app.use((req, res) => {
    res.status(404).json({
        mensaje: 'Ruta no encontrada'
    });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Servidor funcionando en http://localhost:${PORT}`);
});