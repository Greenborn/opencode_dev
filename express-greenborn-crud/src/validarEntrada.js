import { ErrorCrud } from './errores.js';
import { TEXTO_LARGO } from './normalizarCampos.js';

const NUMERO = /^-?\d+(\.\d+)?$/;

/**
 * Convierte y valida un valor según la definición del campo.
 * Devuelve { ok: true, valor } o { ok: false, mensaje }.
 * Los booleanos se guardan como 1/0 (SQLite/MySQL no admiten booleanos como bind).
 */
export function validarValor(campo, valor) {
  if (valor === null || valor === '') {
    return { ok: true, valor: null };
  }

  switch (campo.type) {
    case 'text': {
      // textarea/markdown exigen string; el resto de textos acepta también números.
      const esLargo = TEXTO_LARGO.includes(campo.form_type);
      if (typeof valor !== 'string' && !(typeof valor === 'number' && !esLargo)) {
        return { ok: false, mensaje: 'Debe ser texto' };
      }
      const texto = String(valor);
      if (campo.maxLength !== undefined && texto.length > campo.maxLength) {
        return { ok: false, mensaje: `Máximo ${campo.maxLength} caracteres` };
      }
      return { ok: true, valor: texto };
    }
    case 'number': {
      if (typeof valor === 'number' && Number.isFinite(valor)) return { ok: true, valor };
      if (typeof valor === 'string' && NUMERO.test(valor.trim())) return { ok: true, valor: Number(valor) };
      return { ok: false, mensaje: 'Debe ser un número' };
    }
    case 'date': {
      if (typeof valor !== 'string' || Number.isNaN(Date.parse(valor))) {
        return { ok: false, mensaje: 'Fecha inválida' };
      }
      return { ok: true, valor };
    }
    case 'boolean': {
      if (valor === true || valor === 1 || valor === '1' || valor === 'true') return { ok: true, valor: 1 };
      if (valor === false || valor === 0 || valor === '0' || valor === 'false') return { ok: true, valor: 0 };
      return { ok: false, mensaje: 'Debe ser verdadero o falso' };
    }
    case 'select': {
      if (typeof valor !== 'string' && typeof valor !== 'number') {
        return { ok: false, mensaje: 'Valor de selección inválido' };
      }
      // Lookup: la existencia en la tabla externa (con su filtro) se valida después, en validarReferencias.
      if (campo.lookup !== undefined) return { ok: true, valor };
      const existe = campo.options.some((opt) => String(opt.value) === String(valor));
      if (!existe) return { ok: false, mensaje: 'Opción no válida' };
      const opcion = campo.options.find((opt) => String(opt.value) === String(valor));
      return { ok: true, valor: opcion.value };
    }
    default:
      throw new Error(`Tipo de campo no soportado: ${campo.type}`);
  }
}

/**
 * Prepara los datos de escritura (create/update) a partir del body.
 * - Ignora (y registra con logger.warn) las claves que no son escribibles; el pk no escribible
 *   tiene un aviso específico.
 * - En "crear" valida los requeridos; en "editar" sólo los campos presentes.
 * Lanza ErrorCrud(400) con `errors` por campo si hay problemas.
 */
export function prepararEscritura({ campos, datos, modo, logger, recurso, pk }) {
  if (datos === null || typeof datos !== 'object' || Array.isArray(datos)) {
    throw new ErrorCrud(400, 'El cuerpo de la petición debe ser un objeto JSON');
  }

  const escribibles = new Map(campos.filter((c) => c.writable).map((c) => [c.field, c]));

  for (const clave of Object.keys(datos)) {
    if (clave === pk && !escribibles.has(clave)) {
      logger.warn(`[CRUD ${recurso}] pk "${clave}" no es escribible (pkEscribible: false): ignorado`);
    } else if (!escribibles.has(clave)) {
      logger.warn(`[CRUD ${recurso}] campo "${clave}" fuera de campos escribibles: ignorado`);
    }
  }

  const valores = {};
  const errors = {};

  for (const campo of escribibles.values()) {
    // Los multiselect no son columnas: se escriben en la tabla intermedia (ver lookups.js).
    if (campo.relacion !== undefined) continue;
    const presente = Object.prototype.hasOwnProperty.call(datos, campo.field);
    if (!presente) {
      if (modo === 'crear' && campo.required) errors[campo.field] = 'Campo requerido';
      continue;
    }

    const valor = datos[campo.field];
    if (campo.required && (valor === null || valor === undefined || valor === '')) {
      errors[campo.field] = 'Campo requerido';
      continue;
    }

    const resultado = validarValor(campo, valor);
    if (!resultado.ok) {
      errors[campo.field] = resultado.mensaje;
      continue;
    }
    valores[campo.field] = resultado.valor;
  }

  if (Object.keys(errors).length > 0) {
    throw new ErrorCrud(400, 'Datos inválidos', errors);
  }
  return valores;
}
