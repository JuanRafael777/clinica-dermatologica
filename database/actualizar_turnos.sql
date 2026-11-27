-- Ejecutar en HeidiSQL sobre la base existente. Mantiene los turnos registrados.
USE clinica_dermatologica;
SELECT MIN(idx) INTO @indice_anterior FROM (
    SELECT INDEX_NAME AS idx FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='citas' AND NON_UNIQUE=0
    GROUP BY INDEX_NAME HAVING GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX)='fecha,hora'
) AS indices;
SET @sql_turnos = IF(@indice_anterior IS NULL, 'SELECT 1', CONCAT(
    'ALTER TABLE citas DROP INDEX `', REPLACE(@indice_anterior,'`','``'), '`, ',
    'ADD COLUMN hora_reservada TIME GENERATED ALWAYS AS (CASE WHEN estado=''Cancelada'' THEN NULL ELSE hora END) STORED, ',
    'ADD UNIQUE KEY uq_citas_turno (fecha,hora_reservada)'));
PREPARE cambio FROM @sql_turnos;
EXECUTE cambio;
DEALLOCATE PREPARE cambio;
