import { IDENTIFICADOR } from './errores.js';
import { validarColumnaDeJoin } from './joins.js';

export const TIPOS = ['text', 'number', 'date', 'boolean', 'select', 'multiselect'];
export const FORM_TYPES = ['text', 'number', 'date', 'checkbox', 'select', 'multiselect', 'textarea', 'markdown', 'email'];
/** form_type de texto largo: sólo válidos para `type: 'text'`; el backend los trata como texto normal. */
export const TEXTO_LARGO = ['textarea', 'markdown'];
/** Máximo de opciones que se cargan de un lookup en cada request (`fields_def.options`). */
export const OPCIONES_MAX = 1000;
/** Máximo de ids aceptados en un campo multiselect. */
export const MULTISELECT_MAX = 1000;
/** Filas por defecto de un form_type textarea (se reporta en fields_def.filas). */
export const FILAS_DEFAULT = 4;

const CLAVES_LOOKUP = ['tabla', 'valor', 'etiqueta', 'filtro'];
const CLAVES_RELACION = ['tabla', 'fkOrigen', 'fkDestino', 'lookup'];

const esObjetoPlano = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const esEnteroPositivo = (v) => Number.isInteger(v) && v >= 1;

/** Operadores de filtro disponibles (campo `operadores` de filterable). */
export const OPERADORES = ['igual', 'distinto', 'contiene', 'en', 'rango', 'nulo'];
/** Operadores permitidos por tipo cuando el campo no declara `operadores`. */
const OPERADORES_POR_TIPO = {
  text: ['contiene', 'igual', 'distinto', 'en', 'nulo'],
  number: ['igual', 'distinto', 'en', 'rango', 'nulo'],
  date: ['igual', 'distinto', 'en', 'rango', 'nulo'],
  boolean: ['igual', 'distinto', 'en', 'nulo'],
  select: ['igual', 'distinto', 'en', 'nulo'],
  multiselect: [],
};
/** Operadores permitidos de un campo filtrable (declarados o por defecto del tipo). */
export function operadoresDeCampo(campo) {
  return campo.operadores === undefined ? [...OPERADORES_POR_TIPO[campo.type]] : campo.operadores;
}

/** Máximo de valores en un filtro `en`. */
export const EN_MAX = 100;

const FORM_TYPE_POR_TIPO = {
  text: 'text',
  number: 'number',
  date: 'date',
  boolean: 'checkbox',
  select: 'select',
  multiselect: 'multiselect',
};

/** Valida `lookup: { tabla, valor, etiqueta, filtro? }` y devuelve la forma normalizada (filtro: función o null). */
function validarLookup(lookup, prefijo) {
  if (!esObjetoPlano(lookup)) {
    throw new Error(`createCrudRouter: ${prefijo}.lookup debe ser un objeto { tabla, valor, etiqueta, filtro? }`);
  }
  for (const clave of Object.keys(lookup)) {
    if (!CLAVES_LOOKUP.includes(clave)) throw new Error(`createCrudRouter: ${prefijo}.lookup: opción desconocida "${clave}"`);
  }
  for (const clave of ['tabla', 'valor', 'etiqueta']) {
    if (typeof lookup[clave] !== 'string' || !IDENTIFICADOR.test(lookup[clave])) {
      throw new Error(`createCrudRouter: ${prefijo}.lookup.${clave} debe ser un nombre de tabla/columna válido`);
    }
  }
  if (lookup.filtro !== undefined && lookup.filtro !== null && typeof lookup.filtro !== 'function') {
    throw new Error(`createCrudRouter: ${prefijo}.lookup.filtro debe ser una función (req) => { columna: valor } o null`);
  }
  return {
    tabla: lookup.tabla,
    valor: lookup.valor,
    etiqueta: lookup.etiqueta,
    filtro: typeof lookup.filtro === 'function' ? lookup.filtro : null,
  };
}

/** Valida `relacion: { tabla, fkOrigen, fkDestino, lookup }` de un campo multiselect. */
function validarRelacion(relacion, prefijo) {
  if (!esObjetoPlano(relacion)) {
    throw new Error(`createCrudRouter: ${prefijo}.relacion debe ser un objeto { tabla, fkOrigen, fkDestino, lookup }`);
  }
  for (const clave of Object.keys(relacion)) {
    if (!CLAVES_RELACION.includes(clave)) throw new Error(`createCrudRouter: ${prefijo}.relacion: opción desconocida "${clave}"`);
  }
  for (const clave of ['tabla', 'fkOrigen', 'fkDestino']) {
    if (typeof relacion[clave] !== 'string' || !IDENTIFICADOR.test(relacion[clave])) {
      throw new Error(`createCrudRouter: ${prefijo}.relacion.${clave} debe ser un nombre de tabla/columna válido`);
    }
  }
  return {
    tabla: relacion.tabla,
    fkOrigen: relacion.fkOrigen,
    fkDestino: relacion.fkDestino,
    lookup: validarLookup(relacion.lookup, `${prefijo}.relacion`),
  };
}

/**
 * Valida el array `campos` (contrato compartido con el front).
 * Lanza Error de configuración si algo no cumple. Devuelve definiciones normalizadas.
 *
 * `pk` y `pkEscribible` son opcionales: si el campo `pk` aparece en `campos` y `pkEscribible`
 * no es true, se fuerza `writable: false` (la base genera la clave; el valor del body se ignora).
 */
export function normalizarCampos(campos, { pk = null, pkEscribible = false, aliasesJoins = new Set() } = {}) {
  if (!Array.isArray(campos) || campos.length === 0) {
    throw new Error('createCrudRouter: la opción "campos" debe ser un array con al menos una definición');
  }

  const vistos = new Set();
  const normalizados = campos.map((campo, indice) => {
    const etiqueta = `campos[${indice}]`;
    if (campo === null || typeof campo !== 'object' || Array.isArray(campo)) {
      throw new Error(`createCrudRouter: ${etiqueta} debe ser un objeto`);
    }
    if (typeof campo.field !== 'string' || !IDENTIFICADOR.test(campo.field)) {
      throw new Error(`createCrudRouter: ${etiqueta}.field inválido (solo letras, números y _)`);
    }
    if (vistos.has(campo.field)) {
      throw new Error(`createCrudRouter: campo duplicado "${campo.field}"`);
    }
    vistos.add(campo.field);

    if (typeof campo.headerName !== 'string' || campo.headerName.trim() === '') {
      throw new Error(`createCrudRouter: ${etiqueta}.headerName es obligatorio (campo "${campo.field}")`);
    }
    if (!TIPOS.includes(campo.type)) {
      throw new Error(`createCrudRouter: ${etiqueta}.type debe ser uno de ${TIPOS.join(', ')} (campo "${campo.field}")`);
    }
    const prefijo = `${etiqueta} (campo "${campo.field}")`;

    const formType = campo.form_type === undefined ? FORM_TYPE_POR_TIPO[campo.type] : campo.form_type;
    if (!FORM_TYPES.includes(formType)) {
      throw new Error(`createCrudRouter: ${etiqueta}.form_type inválido (campo "${campo.field}")`);
    }
    if (TEXTO_LARGO.includes(formType) && campo.type !== 'text') {
      throw new Error(`createCrudRouter: ${prefijo}: form_type "${formType}" sólo es válido con type "text"`);
    }
    if ((formType === 'multiselect') !== (campo.type === 'multiselect')) {
      throw new Error(`createCrudRouter: ${prefijo}: form_type "multiselect" exige type "multiselect" y viceversa`);
    }

    // Opciones: estáticas (select), desde lookup (select) o ninguna (multiselect usa relacion.lookup).
    let options;
    let lookup;
    let relacion;
    if (campo.type === 'select' && campo.lookup !== undefined) {
      if (campo.options !== undefined) throw new Error(`createCrudRouter: ${prefijo}: "options" y "lookup" son excluyentes`);
      lookup = validarLookup(campo.lookup, prefijo);
    } else if (campo.lookup !== undefined) {
      throw new Error(`createCrudRouter: ${prefijo}: "lookup" sólo es válido con type "select"`);
    }

    if (campo.type === 'multiselect') {
      if (campo.relacion === undefined) throw new Error(`createCrudRouter: ${prefijo}: type "multiselect" requiere "relacion"`);
      if (campo.options !== undefined) throw new Error(`createCrudRouter: ${prefijo}: multiselect no admite "options" (usa relacion.lookup)`);
      if (campo.sortable === true || campo.filterable === true || campo.searchable === true) {
        throw new Error(`createCrudRouter: ${prefijo}: multiselect no admite sortable, filterable ni searchable`);
      }
      relacion = validarRelacion(campo.relacion, prefijo);
    } else if (campo.relacion !== undefined) {
      throw new Error(`createCrudRouter: ${prefijo}: "relacion" sólo es válido con type "multiselect"`);
    }

    // Columna de tabla unida (joins): sólo lectura, referencia "alias.columna".
    let columna;
    if (campo.columna !== undefined) {
      if (campo.type === 'multiselect') throw new Error(`createCrudRouter: ${prefijo}: multiselect no admite "columna"`);
      validarColumnaDeJoin(campo.columna, aliasesJoins, campo.field);
      columna = campo.columna;
    }

    // Operadores de filtro: sólo con filterable; por defecto los que corresponden al tipo.
    let operadores;
    if (campo.filterable === true && campo.type !== 'multiselect') {
      if (campo.operadores === undefined) {
        operadores = [...OPERADORES_POR_TIPO[campo.type]];
      } else {
        if (!Array.isArray(campo.operadores) || campo.operadores.length === 0) {
          throw new Error(`createCrudRouter: ${prefijo}.operadores debe ser un array no vacío`);
        }
        for (const op of campo.operadores) {
          if (!OPERADORES.includes(op)) throw new Error(`createCrudRouter: ${prefijo}.operadores: operador desconocido "${op}"`);
          if (op === 'contiene' && campo.type !== 'text') throw new Error(`createCrudRouter: ${prefijo}: "contiene" sólo es válido con type "text"`);
          if (op === 'rango' && campo.type !== 'number' && campo.type !== 'date') {
            throw new Error(`createCrudRouter: ${prefijo}: "rango" sólo es válido con type "number" o "date"`);
          }
        }
        if (new Set(campo.operadores).size !== campo.operadores.length) {
          throw new Error(`createCrudRouter: ${prefijo}.operadores tiene valores repetidos`);
        }
        operadores = [...campo.operadores];
      }
    } else if (campo.operadores !== undefined) {
      throw new Error(`createCrudRouter: ${prefijo}: "operadores" sólo es válido con filterable: true`);
    }

    if (campo.type === 'select' && lookup === undefined) {
      if (!Array.isArray(campo.options) || campo.options.length === 0) {
        throw new Error(`createCrudRouter: el campo select "${campo.field}" requiere "options" (array no vacío) o "lookup"`);
      }
      options = campo.options.map((opt) => {
        if (opt === null || typeof opt !== 'object' || !('value' in opt) || typeof opt.label !== 'string') {
          throw new Error(`createCrudRouter: options de "${campo.field}" deben tener { value, label }`);
        }
        return { value: opt.value, label: opt.label };
      });
    }

    let maxLength;
    if (campo.maxLength !== undefined) {
      if (campo.type !== 'text') throw new Error(`createCrudRouter: ${prefijo}: "maxLength" sólo es válido con type "text"`);
      if (!esEnteroPositivo(campo.maxLength)) throw new Error(`createCrudRouter: ${prefijo}.maxLength debe ser un entero mayor o igual a 1`);
      maxLength = campo.maxLength;
    }

    let filas;
    if (campo.filas !== undefined) {
      if (formType !== 'textarea') throw new Error(`createCrudRouter: ${prefijo}: "filas" sólo es válido con form_type "textarea"`);
      if (!esEnteroPositivo(campo.filas)) throw new Error(`createCrudRouter: ${prefijo}.filas debe ser un entero mayor o igual a 1`);
    }
    if (formType === 'textarea') filas = campo.filas === undefined ? FILAS_DEFAULT : campo.filas;

    return {
      field: campo.field,
      headerName: campo.headerName,
      type: campo.type,
      form_type: formType,
      sortable: campo.sortable === true,
      filterable: campo.filterable === true,
      searchable: campo.searchable === true,
      writable: columna === undefined && !(campo.field === pk && pkEscribible !== true) && campo.writable !== false,
      required: columna === undefined && campo.required === true,
      options,
      operadores,
      columna,
      lookup,
      relacion,
      maxLength,
      filas,
      css: typeof campo.css === 'string' ? campo.css : undefined,
    };
  });

  // Dos campos multiselect no pueden compartir tabla intermedia: el reemplazo de N:M borra por fkOrigen.
  const intermedias = new Set();
  for (const campo of normalizados) {
    if (campo.relacion === undefined) continue;
    if (intermedias.has(campo.relacion.tabla)) {
      throw new Error(`createCrudRouter: la tabla intermedia "${campo.relacion.tabla}" se usa en más de un campo multiselect`);
    }
    intermedias.add(campo.relacion.tabla);
  }

  return normalizados;
}

/** Lookup (select con datos de otra tabla) o lookup de relación (multiselect) de un campo normalizado; undefined si no tiene. */
export function lookupDeCampo(campo) {
  if (campo.lookup !== undefined) return campo.lookup;
  if (campo.relacion !== undefined) return campo.relacion.lookup;
  return undefined;
}

/** Proyección pública de un campo normalizado (sin `options` de lookup: esas se cargan por request). */
export function publicoCampo(c) {
  const pub = {
    field: c.field,
    headerName: c.headerName,
    type: c.type,
    form_type: c.form_type,
    sortable: c.sortable,
    filterable: c.filterable,
    searchable: c.searchable,
    writable: c.writable,
    required: c.required,
  };
  if (c.options) pub.options = c.options;
  if (c.operadores) pub.operadores = c.operadores;
  if (c.maxLength !== undefined) pub.maxLength = c.maxLength;
  if (c.filas !== undefined) pub.filas = c.filas;
  if (c.css !== undefined) pub.css = c.css;
  return pub;
}

/** Proyección pública que se envía al front como `fields_def`. */
export function camposPublicos(campos) {
  return campos.map(publicoCampo);
}
