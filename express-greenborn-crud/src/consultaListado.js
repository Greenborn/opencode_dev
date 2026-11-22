import { ErrorCrud } from './errores.js';
import { validarValor } from './validarEntrada.js';
import { OPERADORES, EN_MAX, operadoresDeCampo } from './normalizarCampos.js';

export const PAGE_SIZE_DEFAULT = 25;
export const PAGE_SIZE_MAX = 500;
export const SEARCH_MAX = 200;
export const MODOS_BUSQUEDA = ['contiene', 'empieza', 'termina', 'igual'];

const TIPO_TEXTO_POR_CLIENTE = {
  'better-sqlite3': 'TEXT',
  sqlite3: 'TEXT',
  mysql: 'CHAR',
  mysql2: 'CHAR',
  pg: 'TEXT',
  postgres: 'TEXT',
  postgresql: 'TEXT',
};

/**
 * Devuelve el tipo de CAST para convertir a texto según el dialecto de Knex:
 * MySQL/MariaDB `CHAR` (no existe `AS TEXT`), SQLite y PostgreSQL `TEXT`.
 * Lanza error si el cliente no se puede determinar o no está soportado.
 */
export function tipoCastTexto(knex) {
  const cliente = knex === null || knex === undefined ? undefined : knex.client;
  const configCliente = cliente === undefined || cliente === null ? undefined : cliente.config;
  let nombre = null;
  if (configCliente !== undefined && configCliente !== null && typeof configCliente.client === 'string') {
    nombre = configCliente.client;
  } else if (cliente !== undefined && cliente !== null && typeof cliente.driverName === 'string') {
    nombre = cliente.driverName;
  }
  if (nombre === null) {
    throw new Error('createCrudRouter: no se puede determinar el dialecto de Knex (knex.client.config.client)');
  }
  if (!Object.prototype.hasOwnProperty.call(TIPO_TEXTO_POR_CLIENTE, nombre)) {
    throw new Error(`createCrudRouter: dialecto de Knex no soportado para búsqueda de texto: "${nombre}"`);
  }
  return TIPO_TEXTO_POR_CLIENTE[nombre];
}

/** Escapa los comodines de LIKE; se usa junto con ESCAPE '\\'. */
export function escaparLike(texto) {
  return texto.replace(/[\\%_]/g, (m) => `\\${m}`);
}

/** Patrón LIKE según el modo de coincidencia (el texto va escapado). */
export function patronBusqueda(texto, modo) {
  const escapado = escaparLike(texto);
  if (modo === 'empieza') return `${escapado}%`;
  if (modo === 'termina') return `%${escapado}`;
  return `%${escapado}%`;
}

/** Compatibilidad con 0.3.0: patrón "contiene". */
export function patronContiene(texto) {
  return patronBusqueda(texto, 'contiene');
}

function enteroPositivo(nombre, valor) {
  if (valor === undefined) return null;
  if (typeof valor !== 'string' || !/^\d+$/.test(valor) || Number(valor) < 1) {
    throw new ErrorCrud(400, 'Parámetro inválido', { [nombre]: 'Debe ser un entero mayor o igual a 1' });
  }
  return Number(valor);
}

/** Valida la opción `paginacion` (ya con valores por defecto) y devuelve la forma normalizada. */
export function normalizarPaginacion(paginacion) {
  const opciones = paginacion === undefined ? {} : paginacion;
  if (opciones === null || typeof opciones !== 'object' || Array.isArray(opciones)) {
    throw new Error('createCrudRouter: la opción "paginacion" debe ser un objeto { tamanoDefecto, tamanoMaximo, tamanosPermitidos }');
  }
  for (const clave of Object.keys(opciones)) {
    if (!['tamanoDefecto', 'tamanoMaximo', 'tamanosPermitidos'].includes(clave)) {
      throw new Error(`createCrudRouter: paginacion: opción desconocida "${clave}"`);
    }
  }
  const enteroMin1 = (v) => Number.isInteger(v) && v >= 1;
  const tamanoMaximo = opciones.tamanoMaximo === undefined ? PAGE_SIZE_MAX : opciones.tamanoMaximo;
  if (!enteroMin1(tamanoMaximo)) throw new Error('createCrudRouter: paginacion.tamanoMaximo debe ser un entero mayor o igual a 1');
  let tamanosPermitidos = null;
  if (opciones.tamanosPermitidos !== undefined) {
    const lista = opciones.tamanosPermitidos;
    if (!Array.isArray(lista) || lista.length === 0 || !lista.every(enteroMin1)) {
      throw new Error('createCrudRouter: paginacion.tamanosPermitidos debe ser un array de enteros mayores o iguales a 1');
    }
    if (lista.some((t) => t > tamanoMaximo)) {
      throw new Error('createCrudRouter: paginacion.tamanosPermitidos no puede superar tamanoMaximo');
    }
    tamanosPermitidos = [...new Set(lista)].sort((a, b) => a - b);
  }
  const tamanoDefectoCalculado = tamanosPermitidos === null
    ? Math.min(PAGE_SIZE_DEFAULT, tamanoMaximo)
    : tamanosPermitidos[0];
  const tamanoDefecto = opciones.tamanoDefecto === undefined ? tamanoDefectoCalculado : opciones.tamanoDefecto;
  if (!enteroMin1(tamanoDefecto) || tamanoDefecto > tamanoMaximo) {
    throw new Error('createCrudRouter: paginacion.tamanoDefecto debe ser un entero entre 1 y tamanoMaximo');
  }
  if (tamanosPermitidos !== null && !tamanosPermitidos.includes(tamanoDefecto)) {
    throw new Error('createCrudRouter: paginacion.tamanoDefecto debe estar en tamanosPermitidos');
  }
  return { tamanoDefecto, tamanoMaximo, tamanosPermitidos };
}

/**
 * Valor de filtro según el tipo del campo. Devuelve { ok, valor } o { ok: false, mensaje }.
 * Los textos se comparan como texto; el resto usa validarValor (fechas, números, booleanos, selects).
 */
function valorFiltro(campo, valor) {
  if (campo.type === 'text') {
    if (typeof valor !== 'string' && typeof valor !== 'number') return { ok: false, mensaje: 'Valor de filtro inválido' };
    return { ok: true, valor: String(valor) };
  }
  return validarValor(campo, valor);
}

/**
 * Parsea y valida la query de GET /list.
 * Todo nombre de columna se valida contra la whitelist `campos` antes de usarse.
 * `paginacion` es la opción normalizada de createCrudRouter (normalizarPaginacion).
 *
 * Filtros, dos formas:
 *  - `{ campo: valor }`: texto => contiene; resto => igual (compatible con 0.3.0 y TableEditor).
 *  - `{ campo: { op, valor } }` con op de `OPERADORES`; `rango` usa `{ op, desde, hasta }`
 *    y `en` usa `valor` como array. Sólo se admiten los operadores declarados en el campo.
 */
export function parsearConsultaListado(query, campos, logger, paginacion) {
  if (query === null || typeof query !== 'object') {
    throw new ErrorCrud(400, 'Query de listado inválida');
  }
  const q = query;
  const errors = {};
  const pag = paginacion === undefined ? normalizarPaginacion(undefined) : paginacion;

  const pageParseada = enteroPositivo('page', q.page);
  const page = pageParseada === null ? 1 : pageParseada;
  const pageSizeParseado = enteroPositivo('pageSize', q.pageSize);
  let pageSize = pag.tamanoDefecto;
  if (pageSizeParseado !== null) {
    if (pageSizeParseado > pag.tamanoMaximo) {
      errors.pageSize = `Máximo ${pag.tamanoMaximo}`;
    } else if (pag.tamanosPermitidos !== null && !pag.tamanosPermitidos.includes(pageSizeParseado)) {
      errors.pageSize = `Tamaño no permitido (valores: ${pag.tamanosPermitidos.join(', ')})`;
    } else {
      pageSize = pageSizeParseado;
    }
  }

  const sortable = new Set(campos.filter((c) => c.sortable).map((c) => c.field));
  let sortField = null;
  let sortOrder = null;
  if (q.sortField !== undefined && q.sortField !== '') {
    if (typeof q.sortField !== 'string' || !sortable.has(q.sortField)) {
      errors.sortField = 'Campo de orden no permitido';
    } else {
      sortField = q.sortField;
      if (q.sortOrder === undefined || q.sortOrder === 'asc') sortOrder = 'asc';
      else if (q.sortOrder === 'desc') sortOrder = 'desc';
      else errors.sortOrder = 'Debe ser asc o desc';
    }
  }

  let search = null;
  if (q.search !== undefined && q.search !== '') {
    if (typeof q.search !== 'string' || q.search.length > SEARCH_MAX) {
      errors.search = `Texto de búsqueda inválido (máximo ${SEARCH_MAX} caracteres)`;
    } else {
      const buscables = campos.filter((c) => c.searchable);
      if (buscables.length === 0) errors.search = 'La tabla no tiene campos buscables';
      else search = q.search;
    }
  }

  const filterable = new Map(campos.filter((c) => c.filterable).map((c) => [c.field, c]));
  const filters = [];
  if (q.filters !== undefined && q.filters !== '') {
    let parseado;
    if (typeof q.filters !== 'string') {
      errors.filters = 'Debe ser un JSON de objeto';
    } else {
      try {
        parseado = JSON.parse(q.filters);
      } catch (err) {
        logger.warn(`[CRUD] filters con JSON inválido: ${err.message}`);
        errors.filters = 'JSON inválido';
      }
    }
    if (parseado !== undefined) {
      if (parseado === null || typeof parseado !== 'object' || Array.isArray(parseado)) {
        errors.filters = 'Debe ser un JSON de objeto';
      } else {
        for (const [nombre, crudo] of Object.entries(parseado)) {
          const clave = `filters.${nombre}`;
          const campo = filterable.get(nombre);
          if (!campo) {
            errors[clave] = 'Campo de filtro no permitido';
            continue;
          }
          const resultado = parsearFiltro(campo, crudo);
          if (resultado.error) {
            errors[clave] = resultado.error;
            continue;
          }
          filters.push(resultado.filtro);
        }
      }
    }
  }

  if (Object.keys(errors).length > 0) {
    throw new ErrorCrud(400, 'Parámetros de listado inválidos', errors);
  }

  return { page, pageSize, sortField, sortOrder, search, filters };
}

/** Convierte un filtro crudo de la query en { filtro } o { error }. */
function parsearFiltro(campo, crudo) {
  const operadoresPermitidos = operadoresDeCampo(campo);
  // Forma simple (compatibilidad): valor primitivo con el operador por defecto del tipo.
  if (typeof crudo === 'string' || typeof crudo === 'number' || typeof crudo === 'boolean') {
    const op = campo.type === 'text' ? 'contiene' : 'igual';
    if (!operadoresPermitidos.includes(op)) return { error: 'Operador no permitido para este campo' };
    const r = valorFiltro(campo, crudo);
    if (!r.ok) return { error: r.mensaje };
    return { filtro: { campo, op, valor: r.valor } };
  }
  if (crudo === null || typeof crudo !== 'object' || Array.isArray(crudo)) {
    return { error: 'Valor de filtro inválido' };
  }
  const op = crudo.op;
  if (!OPERADORES.includes(op)) return { error: 'Operador de filtro desconocido' };
  if (!operadoresPermitidos.includes(op)) return { error: 'Operador no permitido para este campo' };

  if (op === 'igual' || op === 'distinto' || op === 'contiene') {
    const v = crudo.valor;
    if (v === undefined) return { error: 'Falta el valor del filtro' };
    if (op === 'contiene') {
      if (campo.type !== 'text' || typeof v !== 'string' || v === '') return { error: 'Texto de filtro inválido' };
      return { filtro: { campo, op, valor: v } };
    }
    if (v === null) return { filtro: { campo, op, valor: null } };
    const r = valorFiltro(campo, v);
    if (!r.ok) return { error: r.mensaje };
    return { filtro: { campo, op, valor: r.valor } };
  }

  if (op === 'en') {
    const lista = crudo.valor;
    if (!Array.isArray(lista) || lista.length === 0 || lista.length > EN_MAX) {
      return { error: `Debe ser una lista de 1 a ${EN_MAX} valores` };
    }
    const valores = [];
    for (const item of lista) {
      if (item === null) return { error: 'La lista no admite valores nulos' };
      const r = valorFiltro(campo, item);
      if (!r.ok) return { error: r.mensaje };
      valores.push(r.valor);
    }
    return { filtro: { campo, op, valores: [...new Set(valores)] } };
  }

  if (op === 'rango') {
    const desde = crudo.desde === undefined ? null : crudo.desde;
    const hasta = crudo.hasta === undefined ? null : crudo.hasta;
    if (desde === null && hasta === null) return { error: 'El rango necesita "desde" o "hasta"' };
    const valorDesde = desde === null ? null : valorFiltro(campo, desde);
    if (valorDesde !== null && !valorDesde.ok) return { error: valorDesde.mensaje };
    const valorHasta = hasta === null ? null : valorFiltro(campo, hasta);
    if (valorHasta !== null && !valorHasta.ok) return { error: valorHasta.mensaje };
    return {
      filtro: {
        campo,
        op,
        desde: valorDesde === null ? null : valorDesde.valor,
        hasta: valorHasta === null ? null : valorHasta.valor,
      },
    };
  }

  // op === 'nulo'
  if (typeof crudo.valor !== 'boolean') return { error: 'Debe ser verdadero o falso' };
  return { filtro: { campo, op, valor: crudo.valor } };
}

/**
 * Aplica búsqueda y filtros (WHERE) sobre un query builder. Devuelve el mismo qb.
 * `colSql(campo)` devuelve la expresión de columna (qualificada si hay joins).
 * `busqueda.modo` es el modo de coincidencia de la búsqueda global.
 */
export function aplicarFiltrosListado(qb, consulta, campos, tipoTexto, { colSql = (c) => c.field, modoBusqueda = 'contiene' } = {}) {
  if (consulta.search !== null) {
    const buscables = campos.filter((c) => c.searchable);
    const texto = consulta.search;
    qb.where(function () {
      for (const campo of buscables) {
        if (modoBusqueda === 'igual') {
          this.orWhereRaw(`CAST(?? AS ${tipoTexto}) = ?`, [colSql(campo), texto]);
        } else {
          this.orWhereRaw(`CAST(?? AS ${tipoTexto}) LIKE ? ESCAPE ?`, [colSql(campo), patronBusqueda(texto, modoBusqueda), '\\']);
        }
      }
    });
  }

  for (const filtro of consulta.filters) {
    const col = colSql(filtro.campo);
    switch (filtro.op) {
      case 'igual':
        if (filtro.valor === null) qb.whereNull(col);
        else qb.where(col, filtro.valor);
        break;
      case 'distinto':
        if (filtro.valor === null) qb.whereNotNull(col);
        else qb.where(col, '<>', filtro.valor);
        break;
      case 'contiene':
        qb.whereRaw(`CAST(?? AS ${tipoTexto}) LIKE ? ESCAPE ?`, [col, patronContiene(filtro.valor), '\\']);
        break;
      case 'en':
        qb.whereIn(col, filtro.valores);
        break;
      case 'rango':
        if (filtro.desde !== null) qb.where(col, '>=', filtro.desde);
        if (filtro.hasta !== null) qb.where(col, '<=', filtro.hasta);
        break;
      case 'nulo':
        if (filtro.valor) qb.whereNull(col);
        else qb.whereNotNull(col);
        break;
      default:
        throw new Error(`filtro con operador desconocido: ${filtro.op}`);
    }
  }
  return qb;
}
