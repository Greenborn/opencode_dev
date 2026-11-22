import { IDENTIFICADOR } from './errores.js';

const CLAVES_JOIN = ['tabla', 'alias', 'on', 'tipo'];
const TIPOS_JOIN = ['left', 'inner'];
/** Referencia de columna: `columna` o `alias.columna` (ambas partes validadas). */
const REFERENCIA = /^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*)?$/;

const esObjetoPlano = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/**
 * Valida la opción `joins` y devuelve la forma normalizada.
 * `joins: [{ tabla, alias, on: [origen, destino], tipo: 'left' | 'inner' }]`
 *  - origen: columna de la tabla principal, o `alias.columna` de un join anterior.
 *  - destino: columna de la tabla unida (sin prefijo).
 * Todo identificador se valida con la misma regla que el resto del paquete: nunca se concatena input.
 */
export function validarJoins(joins, tabla) {
  if (joins === undefined) return [];
  if (!Array.isArray(joins)) throw new Error('createCrudRouter: la opción "joins" debe ser un array');
  const aliasesVistos = new Set([tabla]);
  return joins.map((join, indice) => {
    const prefijo = `createCrudRouter: joins[${indice}]`;
    if (!esObjetoPlano(join)) throw new Error(`${prefijo} debe ser un objeto { tabla, alias, on, tipo? }`);
    for (const clave of Object.keys(join)) {
      if (!CLAVES_JOIN.includes(clave)) throw new Error(`${prefijo}: opción desconocida "${clave}"`);
    }
    if (typeof join.tabla !== 'string' || !IDENTIFICADOR.test(join.tabla)) {
      throw new Error(`${prefijo}.tabla debe ser un nombre de tabla válido`);
    }
    if (typeof join.alias !== 'string' || !IDENTIFICADOR.test(join.alias)) {
      throw new Error(`${prefijo}.alias es obligatorio y debe ser un identificador válido`);
    }
    if (aliasesVistos.has(join.alias)) throw new Error(`${prefijo}.alias "${join.alias}" ya está en uso`);
    aliasesVistos.add(join.alias);
    if (!Array.isArray(join.on) || join.on.length !== 2) {
      throw new Error(`${prefijo}.on debe ser [origen, destino]`);
    }
    const [origen, destino] = join.on;
    if (typeof origen !== 'string' || !REFERENCIA.test(origen)) {
      throw new Error(`${prefijo}.on[0] (origen) debe ser "columna" o "alias.columna"`);
    }
    if (origen.includes('.')) {
      const [aliasOrigen] = origen.split('.');
      if (!aliasesVistos.has(aliasOrigen) || aliasOrigen === join.alias) {
        throw new Error(`${prefijo}.on[0]: el alias "${aliasOrigen}" no corresponde a la tabla principal ni a un join anterior`);
      }
    }
    if (typeof destino !== 'string' || !IDENTIFICADOR.test(destino)) {
      throw new Error(`${prefijo}.on[1] (destino) debe ser un nombre de columna válido`);
    }
    const tipo = join.tipo === undefined ? 'left' : join.tipo;
    if (!TIPOS_JOIN.includes(tipo)) throw new Error(`${prefijo}.tipo debe ser left o inner`);
    return { tabla: join.tabla, alias: join.alias, origen, destino, tipo };
  });
}

/** Aliases válidos para `columna` de un campo (los de los joins; la tabla principal no cuenta). */
export function aliasesDeJoins(joins) {
  return new Set(joins.map((j) => j.alias));
}

/** Aplica los joins declarados a un query builder de Knex (el orden es el declarado). */
export function aplicarJoins(qb, joins, tabla) {
  for (const j of joins) {
    const origen = j.origen.includes('.') ? j.origen : `${tabla}.${j.origen}`;
    const unir = j.tipo === 'inner' ? 'innerJoin' : 'leftJoin';
    qb[unir](`${j.tabla} as ${j.alias}`, origen, `${j.alias}.${j.destino}`);
  }
  return qb;
}

/** Comprueba que un nombre de campo `columna` (alias.columna) referencia un join declarado. */
export function validarColumnaDeJoin(columna, aliases, campoNombre) {
  if (typeof columna !== 'string' || !REFERENCIA.test(columna) || !columna.includes('.')) {
    throw new Error(`createCrudRouter: campo "${campoNombre}": columna debe ser "alias.columna"`);
  }
  const [alias] = columna.split('.');
  if (!aliases.has(alias)) {
    throw new Error(`createCrudRouter: campo "${campoNombre}": la columna "${columna}" usa un alias que no está declarado en joins`);
  }
}
