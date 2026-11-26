const pool = require('../config/db');

const obtenerPacientes = async (req, res) => {
    try {
        const [pacientes] = await pool.query(
            'SELECT * FROM pacientes ORDER BY id DESC'
        );

        res.json(pacientes);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            mensaje: 'Error al obtener pacientes'
        });
    }
};


const obtenerPaciente = async (req, res) => {
    try {
        const { id } = req.params;

        const [pacientes] = await pool.query(
            'SELECT * FROM pacientes WHERE id = ?',
            [id]
        );

        if (pacientes.length === 0) {
            return res.status(404).json({
                mensaje: 'Paciente no encontrado'
            });
        }

        res.json(pacientes[0]);

    } catch (error) {
        res.status(500).json({
            mensaje: 'Error al obtener paciente'
        });
    }
};


const crearPaciente = async (req, res) => {
    try {
        const {
            nombre,
            cedula,
            telefono,
            correo,
            tipo_piel
        } = req.body;

        if (!nombre || !cedula) {
            return res.status(400).json({
                mensaje: 'Nombre y cédula son obligatorios'
            });
        }

        const [resultado] = await pool.query(
            `INSERT INTO pacientes
            (nombre, cedula, telefono, correo, tipo_piel)
            VALUES (?, ?, ?, ?, ?)`,
            [
                nombre,
                cedula,
                telefono,
                correo,
                tipo_piel
            ]
        );

        res.status(201).json({
            mensaje: 'Paciente creado correctamente',
            id: resultado.insertId
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            mensaje: 'Error al crear paciente'
        });
    }
};


const actualizarPaciente = async (req, res) => {
    try {
        const { id } = req.params;

        const {
            nombre,
            cedula,
            telefono,
            correo,
            tipo_piel
        } = req.body;

        const [resultado] = await pool.query(
            `UPDATE pacientes
             SET nombre = ?,
                 cedula = ?,
                 telefono = ?,
                 correo = ?,
                 tipo_piel = ?
             WHERE id = ?`,
            [
                nombre,
                cedula,
                telefono,
                correo,
                tipo_piel,
                id
            ]
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({
                mensaje: 'Paciente no encontrado'
            });
        }

        res.json({
            mensaje: 'Paciente actualizado correctamente'
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            mensaje: 'Error al actualizar paciente'
        });
    }
};


const eliminarPaciente = async (req, res) => {
    try {
        const { id } = req.params;

        const [resultado] = await pool.query(
            'DELETE FROM pacientes WHERE id = ?',
            [id]
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({
                mensaje: 'Paciente no encontrado'
            });
        }

        res.json({
            mensaje: 'Paciente eliminado correctamente'
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            mensaje: 'Error al eliminar paciente'
        });
    }
};


module.exports = {
    obtenerPacientes,
    obtenerPaciente,
    crearPaciente,
    actualizarPaciente,
    eliminarPaciente
};