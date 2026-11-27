USE clinica_dermatologica;
SET @cambio = IF(EXISTS(SELECT 1 FROM information_schema.columns
 WHERE table_schema=DATABASE() AND table_name='tratamientos' AND column_name='imagen_webp'),
 'SELECT 1', 'ALTER TABLE tratamientos ADD COLUMN imagen_webp MEDIUMBLOB NULL');
PREPARE cambio FROM @cambio;
EXECUTE cambio;
DEALLOCATE PREPARE cambio;
