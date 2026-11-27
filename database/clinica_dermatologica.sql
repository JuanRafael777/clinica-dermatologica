CREATE DATABASE IF NOT EXISTS clinica_dermatologica;
USE clinica_dermatologica;

CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    rol VARCHAR(30) NOT NULL DEFAULT 'administrador'
);

CREATE TABLE pacientes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    cedula VARCHAR(20) NOT NULL UNIQUE,
    telefono VARCHAR(20),
    correo VARCHAR(100),
    tipo_piel VARCHAR(50)
);

CREATE TABLE tratamientos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    precio DECIMAL(10,2) NOT NULL,
    duracion_min INT NOT NULL
);

CREATE TABLE citas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    paciente_id INT NOT NULL,
    tratamiento_id INT NOT NULL,
    fecha DATE NOT NULL,
    hora TIME NOT NULL,
    estado ENUM('Pendiente','Confirmada','Cancelada','Completada') DEFAULT 'Pendiente',
    FOREIGN KEY (paciente_id) REFERENCES pacientes(id),
    FOREIGN KEY (tratamiento_id) REFERENCES tratamientos(id),
    UNIQUE (fecha, hora)
);

CREATE TABLE consultas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cita_id INT NOT NULL,
    diagnostico TEXT NOT NULL,
    receta TEXT,
    total DECIMAL(10,2) NOT NULL,
    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cita_id) REFERENCES citas(id)
);

INSERT INTO tratamientos (nombre, descripcion, precio, duracion_min) VALUES
('Limpieza facial', 'Limpieza profunda de la piel', 1500.00, 60),
('Peeling químico', 'Tratamiento para mejorar textura y manchas', 2500.00, 45),
('Tratamiento para acné', 'Tratamiento dermatológico para el acné', 3000.00, 60),
('Hidratación facial', 'Tratamiento de hidratación profunda', 1800.00, 45);
