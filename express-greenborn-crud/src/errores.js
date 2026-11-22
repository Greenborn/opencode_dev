/**
 * Error con código HTTP y, opcionalmente, errores por campo.
 * El router lo convierte en respuesta `{ status: false, message, errors? }`.
 */
export class ErrorCrud extends Error {
  constructor(status, message, errors) {
    super(message);
    this.name = 'ErrorCrud';
    this.status = status;
    this.errors = errors;
  }
}

export const IDENTIFICADOR = /^[A-Za-z_][A-Za-z0-9_]*$/;

export const MENSAJE_DUPLICADO = 'Ya existe un registro con ese valor';
export const MENSAJE_REFERENCIA = 'La operación viola una referencia: el registro está en uso o referencia un registro inexistente';

// Códigos de error del driver (MySQL/MariaDB y SQLite). PostgreSQL no se mapea: sus errores siguen siendo 500.
const CODIGOS_DUPLICADO = new Set(['ER_DUP_ENTRY', 'SQLITE_CONSTRAINT_UNIQUE', 'SQLITE_CONSTRAINT_PRIMARYKEY']);
const CODIGOS_REFERENCIA = new Set([
  'ER_ROW_IS_REFERENCED',
  'ER_ROW_IS_REFERENCED_2',
  'ER_NO_REFERENCED_ROW_2',
  'SQLITE_CONSTRAINT_FOREIGNKEY',
]);

/**
 * Traduce un error de base de datos a ErrorCrud(409) si es de unicidad o de clave foránea.
 * Devuelve null para cualquier otro error (el llamador responde 500).
 */
export function mapearErrorBd(err) {
  if (err === null || typeof err !== 'object' || typeof err.code !== 'string') return null;
  if (CODIGOS_DUPLICADO.has(err.code)) return new ErrorCrud(409, MENSAJE_DUPLICADO);
  if (CODIGOS_REFERENCIA.has(err.code)) return new ErrorCrud(409, MENSAJE_REFERENCIA);
  return null;
}
