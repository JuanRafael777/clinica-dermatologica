const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./src/routes/authRoutes');
const pacientesRoutes = require('./src/routes/pacientesRoutes');

const app = express();

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', authRoutes);
app.use('/api/pacientes', pacientesRoutes);

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