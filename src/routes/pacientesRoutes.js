const express = require('express');

const {
    obtenerPacientes,
    obtenerPaciente,
    crearPaciente,
    actualizarPaciente,
    eliminarPaciente
} = require('../controllers/pacientesController');

const verifyToken = require('../middlewares/verifyToken');

const router = express.Router();

router.get('/', verifyToken, obtenerPacientes);

router.get('/:id', verifyToken, obtenerPaciente);

router.post('/', verifyToken, crearPaciente);

router.put('/:id', verifyToken, actualizarPaciente);

router.delete('/:id', verifyToken, eliminarPaciente);

module.exports = router;