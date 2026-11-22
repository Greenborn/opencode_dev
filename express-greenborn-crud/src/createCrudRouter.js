import express from 'express';
import { ErrorCrud, IDENTIFICADOR, mapearErrorBd } from './errores.js';
import { normalizarCampos, publicoCampo, lookupDeCampo } from './normalizarCampos.js';
import { prepararEscritura } from './validarEntrada.js';
import {
  parsearConsultaListado, aplicarFiltrosListado, tipoCastTexto, normalizarPaginacion, MODOS_BUSQUEDA,
} from './consultaListado.js';
import { validarJoins, aliasesDeJoins, aplicarJoins } from './joins.js';
import { cargarOpciones, completarFilas, validarReferencias, escribirRelaciones, borrarRelaciones } from './lookups.js';

const HOOKS_VALIDOS = ['antesCrear', 'despuesCrear', 'antesEditar', 'despuesEditar', 'antesEliminar', 'despuesEliminar'];
const CLAVES_SOFT_DELETE = ['campo', 'valor', 'extra'];

const esObjetoPlano = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

function validarSoftDelete(softDelete, pk) {
  if (softDelete === undefined) return null;
  if (!esObjetoPlano(softDelete)) {
    throw new Error('createCrudRouter: la opción "softDelete" debe ser un objeto { campo, valor, extra? }');
  }
  for (const clave of Object.keys(softDelete)) {
    if (!CLAVES_SOFT_DELETE.includes(clave)) throw new Error(`createCrudRouter: opción desconocida en softDelete: "${clave}"`);
  }
  const { campo, valor, extra = {} } = softDelete;
  if (typeof campo !== 'string' || !IDENTIFICADOR.test(campo)) {
    throw new Error('createCrudRouter: softDelete.campo debe ser un nombre de columna válido');
  }
  if (campo === pk) {
    throw new Error('createCrudRouter: softDelete.campo no puede ser la clave primaria');
  }
  if (valor === undefined || (valor !== null && typeof valor === 'object')) {
    throw new Error('createCrudRouter: softDelete.valor es obligatorio y debe ser un valor primitivo');
  }
  if (!esObjetoPlano(extra)) {
    throw new Error('createCrudRouter: softDelete.extra debe ser un objeto { columna: valor }');
  }
  for (const [columna, v] of Object.entries(extra)) {
    if (!IDENTIFICADOR.test(columna)) throw new Error(`createCrudRouter: softDelete.extra: columna inválida "${columna}"`);
    if (v !== null && typeof v === 'object') throw new Error(`createCrudRouter: softDelete.extra.${columna} debe ser primitivo`);
  }
  return { campo, valor, extra: { ...extra } };
}

/** Opción `ayuda`: sólo claves (strings). El texto de ayuda vive en el front; el back no lo duplica. */
function validarAyuda(ayuda) {
  if (ayuda === undefined) return null;
  if (!esObjetoPlano(ayuda)) throw new Error('createCrudRouter: la opción "ayuda" debe ser un objeto { clave?, botones?, campos? }');
  for (const clave of Object.keys(ayuda)) {
    if (!['clave', 'botones', 'campos'].includes(clave)) throw new Error(`createCrudRouter: ayuda: opción desconocida "${clave}"`);
  }
  if (ayuda.clave !== undefined && typeof ayuda.clave !== 'string') {
    throw new Error('createCrudRouter: ayuda.clave debe ser un string (las funciones se resuelven en el front)');
  }
  const soloStrings = (obj, nombre, permitidas) => {
    if (obj === undefined) return {};
    if (!esObjetoPlano(obj)) throw new Error(`createCrudRouter: ayuda.${nombre} debe ser un objeto`);
    for (const [k, v] of Object.entries(obj)) {
      if (permitidas !== null && !permitidas.includes(k)) throw new Error(`createCrudRouter: ayuda.${nombre}: clave desconocida "${k}"`);
      if (typeof v !== 'string') throw new Error(`createCrudRouter: ayuda.${nombre}.${k} debe ser un string`);
    }
    return { ...obj };
  };
  return {
    clave: ayuda.clave,
    botones: soloStrings(ayuda.botones, 'botones', ['listar', 'crear', 'editar', 'eliminar']),
    campos: soloStrings(ayuda.campos, 'campos', null),
  };
}

function validarConfiguracion(opciones) {
  if (opciones === null || typeof opciones !== 'object') {
    throw new Error('createCrudRouter: se requiere un objeto de opciones');
  }
  const {
    knex, sso, recurso, tabla, campos, pk = 'id', pkEscribible = false, soloLectura = false, filtroBase, alcance,
    softDelete, hooks = {}, activityLog, logger = console, joins, paginacion, busqueda, ayuda,
  } = opciones;

  if (typeof knex !== 'function') {
    throw new Error('createCrudRouter: la opción "knex" es obligatoria (instancia de Knex inyectada)');
  }
  if (sso === null || typeof sso !== 'object' || typeof sso.requirePermission !== 'function') {
    throw new Error('createCrudRouter: la opción "sso" es obligatoria y debe exponer requirePermission (objeto de createSsoAuth)');
  }
  if (typeof recurso !== 'string' || !/^[A-Za-z0-9_-]+$/.test(recurso)) {
    throw new Error('createCrudRouter: la opción "recurso" es obligatoria (string, base de los permisos)');
  }
  if (typeof tabla !== 'string' || !IDENTIFICADOR.test(tabla)) {
    throw new Error('createCrudRouter: la opción "tabla" es obligatoria y debe ser un nombre de tabla válido');
  }
  if (typeof pk !== 'string' || !IDENTIFICADOR.test(pk)) {
    throw new Error('createCrudRouter: la opción "pk" debe ser un nombre de columna válido');
  }
  if (typeof pkEscribible !== 'boolean') {
    throw new Error('createCrudRouter: la opción "pkEscribible" debe ser booleana');
  }
  if (typeof soloLectura !== 'boolean') {
    throw new Error('createCrudRouter: la opción "soloLectura" debe ser booleana');
  }
  if (filtroBase !== undefined && typeof filtroBase !== 'function') {
    throw new Error('createCrudRouter: la opción "filtroBase" debe ser una función (req, qb) => qb');
  }
  if (alcance !== undefined && alcance !== null && typeof alcance !== 'function') {
    throw new Error('createCrudRouter: la opción "alcance" debe ser una función (req) => { campo: valor } o null');
  }
  if (activityLog !== undefined && typeof activityLog !== 'function') {
    throw new Error('createCrudRouter: la opción "activityLog" debe ser una función');
  }
  if (hooks === null || typeof hooks !== 'object') {
    throw new Error('createCrudRouter: la opción "hooks" debe ser un objeto');
  }
  for (const [nombre, fn] of Object.entries(hooks)) {
    if (!HOOKS_VALIDOS.includes(nombre)) throw new Error(`createCrudRouter: hook desconocido "${nombre}"`);
    if (typeof fn !== 'function') throw new Error(`createCrudRouter: el hook "${nombre}" debe ser una función`);
  }
  if (logger === null || typeof logger.error !== 'function' || typeof logger.warn !== 'function') {
    throw new Error('createCrudRouter: "logger" debe exponer error y warn');
  }

  const joinsNorm = validarJoins(joins, tabla);
  const camposNorm = normalizarCampos(campos, { pk, pkEscribible, aliasesJoins: aliasesDeJoins(joinsNorm) });
  const softDeleteNorm = validarSoftDelete(softDelete, pk);
  const tipoTexto = tipoCastTexto(knex);
  const paginacionNorm = normalizarPaginacion(paginacion);
  if (busqueda !== undefined && (!esObjetoPlano(busqueda) || !MODOS_BUSQUEDA.includes(busqueda.modo))) {
    throw new Error(`createCrudRouter: la opción "busqueda" debe ser { modo } con modo en ${MODOS_BUSQUEDA.join(', ')}`);
  }
  const modoBusqueda = busqueda === undefined ? 'contiene' : busqueda.modo;

  return {
    knex, sso, recurso, tabla, pk, pkEscribible, soloLectura, filtroBase,
    alcance: alcance === undefined ? null : alcance, softDelete: softDeleteNorm,
    hooks, activityLog, logger, campos: camposNorm, tipoTexto,
    joins: joinsNorm, paginacion: paginacionNorm, modoBusqueda, ayuda: validarAyuda(ayuda),
  };
}

/** Compara valores del body con los del alcance como texto (1 y "1" se consideran iguales). */
const igualesAlcance = (a, b) => a === b || String(a) === String(b);

/**
 * Router Express CRUD genérico.
 * Rutas: GET /list, GET /:id, POST /, PUT /:id, DELETE /:id (sólo GET si soloLectura).
 * Permisos: `<recurso>.listar|ver|crear|editar|eliminar` vía sso.requirePermission.
 */
export function createCrudRouter(opciones) {
  const cfg = validarConfiguracion(opciones);
  const { knex, sso, recurso, tabla, pk, soloLectura, filtroBase, alcance, softDelete, hooks, activityLog, logger, campos, tipoTexto,
    joins, paginacion, modoBusqueda, ayuda } = cfg;

  const permiso = (accion) => `${recurso}.${accion}`;
  // Sin joins los nombres van sin prefijo (idéntico a 0.3.0); con joins se qualifican con la tabla principal.
  const conJoins = joins.length > 0;
  const colPrincipal = (columna) => (conJoins ? `${tabla}.${columna}` : columna);
  // Expresión SQL de un campo: columna de join (campo.columna) o columna de la tabla principal.
  const colSql = (campo) => (campo.columna !== undefined ? campo.columna : colPrincipal(campo.field));
  // SELECT: pk y campos de la tabla principal; los de join salen con alias = field. Los multiselect no son columnas.
  const seleccion = [...new Set([colPrincipal(pk), ...campos.filter((c) => c.relacion === undefined)
    .map((c) => (c.columna === undefined ? colPrincipal(c.field) : { [c.field]: c.columna }))])];
  // Query builder de lectura: tabla principal + joins declarados.
  const baseLectura = () => aplicarJoins(knex(tabla), joins, tabla);

  // filtroBase es síncrono: no se usa await sobre el query builder de Knex (es thenable y ejecutaría la query).
  function aplicarAlcanceLectura(req, qb) {
    if (!filtroBase) return qb;
    const resultado = filtroBase(req, qb);
    if (resultado === null || typeof resultado !== 'object' || typeof resultado.clone !== 'function') {
      throw new Error('filtroBase debe devolver el query builder');
    }
    return resultado;
  }

  // alcance(req) es síncrona y devuelve los pares que el router fija en el registro (o null si no hay alcance).
  function obtenerAlcance(req) {
    if (!alcance) return null;
    const resultado = alcance(req);
    if (resultado === null || resultado === undefined) return null;
    if (!esObjetoPlano(resultado)) {
      throw new Error('alcance(req) debe devolver un objeto { campo: valor } o null');
    }
    for (const clave of Object.keys(resultado)) {
      if (!IDENTIFICADOR.test(clave)) throw new Error(`alcance(req): nombre de columna inválido "${clave}"`);
    }
    return resultado;
  }

  async function buscarRegistro(req, id) {
    const registro = await aplicarAlcanceLectura(req, baseLectura().where(colPrincipal(pk), id).first(seleccion));
    if (!registro) throw new ErrorCrud(404, 'Registro no encontrado');
    return registro;
  }

  /** Lee un registro por pk (sin filtroBase: se usa tras una escritura del propio router). */
  async function leerCompleto(id) {
    const row = await baseLectura().where(colPrincipal(pk), id).first(seleccion);
    const [completa] = await completarFilas({ knex, campos, pk, filas: [row] });
    return completa;
  }

  /** fields_def del request: el campo lookup/multiselect lleva `options` cargadas desde su tabla. */
  async function fieldsDefPara(req) {
    const defs = [];
    for (const campo of campos) {
      const def = publicoCampo(campo);
      const lookup = lookupDeCampo(campo);
      if (lookup !== undefined) {
        def.options = await cargarOpciones({ knex, lookup, req, logger, nombreCampo: campo.field });
      }
      defs.push(def);
    }
    return defs;
  }

  async function registrarActividad(req, accion, id) {
    if (!activityLog) return;
    try {
      await activityLog(req, { accion, recurso, id });
    } catch (err) {
      // El registro de actividad no debe romper la operación ya realizada: se loguea y se continúa.
      logger.error(`[CRUD ${recurso}] activityLog falló: ${err.message}`);
    }
  }

  // Los hooks antesX deben devolver el objeto de datos (puede ser el mismo); despuesX no devuelven nada.
  async function ejecutarHookAntes(nombre, req, datos, registro) {
    const fn = hooks[nombre];
    if (!fn) return datos;
    const resultado = await fn(req, datos, registro);
    if (resultado === null || typeof resultado !== 'object') {
      throw new Error(`El hook "${nombre}" debe devolver el objeto de datos`);
    }
    return resultado;
  }

  async function ejecutarHookDespues(nombre, req, registro) {
    const fn = hooks[nombre];
    if (fn) await fn(req, registro);
  }

  const wrap = (fn) => async (req, res) => {
    try {
      await fn(req, res);
    } catch (err) {
      if (err instanceof ErrorCrud) {
        const cuerpo = { status: false, message: err.message };
        if (err.errors) cuerpo.errors = err.errors;
        return res.status(err.status).json(cuerpo);
      }
      // El error original se registra siempre, también cuando se traduce a 409.
      logger.error(`[CRUD ${recurso}] error no controlado:`, err);
      const traducido = mapearErrorBd(err);
      if (traducido) return res.status(traducido.status).json({ status: false, message: traducido.message });
      return res.status(500).json({ status: false, message: 'Error interno' });
    }
    return undefined;
  };

  const router = express.Router();

  router.get('/list', sso.requirePermission(permiso('listar')), wrap(async (req, res) => {
    const consulta = parsearConsultaListado(req.query, campos, logger, paginacion);

    let base = aplicarAlcanceLectura(req, baseLectura());
    base = aplicarFiltrosListado(base, consulta, campos, tipoTexto, { colSql, modoBusqueda });

    const [{ total }] = await base.clone().count({ total: '*' });

    const ordenar = (qb) => {
      if (consulta.sortField !== null) {
        const campo = campos.find((c) => c.field === consulta.sortField);
        qb.orderBy(colSql(campo), consulta.sortOrder);
      }
      qb.orderBy(colPrincipal(pk), 'asc');
      return qb;
    };
    const rows = await ordenar(base.clone().select(seleccion))
      .limit(consulta.pageSize)
      .offset((consulta.page - 1) * consulta.pageSize);
    const filas = await completarFilas({ knex, campos, pk, filas: rows });

    const data = { rows: filas, totalRecords: Number(total), fields_def: await fieldsDefPara(req), paginacion };
    if (ayuda !== null) data.ayuda = ayuda;
    res.json({ status: true, data });
  }));

  router.get('/:id', sso.requirePermission(permiso('ver')), wrap(async (req, res) => {
    const row = await buscarRegistro(req, req.params.id);
    const [completa] = await completarFilas({ knex, campos, pk, filas: [row] });
    res.json({ status: true, data: completa, fields_def: await fieldsDefPara(req) });
  }));

  if (!soloLectura) {
    router.post('/', sso.requirePermission(permiso('crear')), wrap(async (req, res) => {
      const alcanceReq = obtenerAlcance(req);
      const errorAlcance = {};
      if (alcanceReq !== null && esObjetoPlano(req.body)) {
        for (const [clave, valor] of Object.entries(alcanceReq)) {
          if (Object.prototype.hasOwnProperty.call(req.body, clave) && !igualesAlcance(req.body[clave], valor)) {
            errorAlcance[clave] = 'No coincide con el alcance del usuario';
          }
        }
        if (Object.keys(errorAlcance).length > 0) {
          throw new ErrorCrud(400, 'Datos fuera de alcance', errorAlcance);
        }
      }

      const datosValidados = prepararEscritura({ campos, datos: req.body, modo: 'crear', logger, recurso, pk });
      const relaciones = await validarReferencias({ knex, campos, datos: req.body, valores: datosValidados, modo: 'crear', req });
      let datos = datosValidados;
      if (alcanceReq !== null) datos = { ...datos, ...alcanceReq };
      datos = await ejecutarHookAntes('antesCrear', req, datos);

      // Registro principal y sus filas de N:M en una sola transacción: no quedan datos a medias.
      const id = await knex.transaction(async (trx) => {
        const insertado = await trx(tabla).insert(datos);
        const nuevoId = datos[pk] !== undefined ? datos[pk] : insertado[0];
        await escribirRelaciones({ trx, relaciones, origenId: nuevoId });
        return nuevoId;
      });
      const row = await leerCompleto(id);
      await registrarActividad(req, 'crear', id);
      await ejecutarHookDespues('despuesCrear', req, row);
      res.status(201).json({ status: true, data: row });
    }));

    router.put('/:id', sso.requirePermission(permiso('editar')), wrap(async (req, res) => {
      const id = req.params.id;
      const existente = await buscarRegistro(req, id);

      // Las claves de alcance no se pueden cambiar: con el mismo valor se descartan; con otro valor, 400.
      const alcanceReq = obtenerAlcance(req);
      let cuerpo = req.body;
      if (alcanceReq !== null && esObjetoPlano(req.body)) {
        const errorAlcance = {};
        cuerpo = { ...req.body };
        for (const [clave, valor] of Object.entries(alcanceReq)) {
          if (!Object.prototype.hasOwnProperty.call(cuerpo, clave)) continue;
          if (!igualesAlcance(cuerpo[clave], valor)) errorAlcance[clave] = 'El campo de alcance no se puede modificar';
          delete cuerpo[clave];
        }
        if (Object.keys(errorAlcance).length > 0) {
          throw new ErrorCrud(400, 'Campos de alcance no modificables', errorAlcance);
        }
      }

      const datosValidados = prepararEscritura({ campos, datos: cuerpo, modo: 'editar', logger, recurso, pk });
      const relaciones = await validarReferencias({ knex, campos, datos: cuerpo, valores: datosValidados, modo: 'editar', req });
      if (Object.keys(datosValidados).length === 0 && relaciones.size === 0) {
        throw new ErrorCrud(400, 'No hay campos para actualizar');
      }
      let datos = await ejecutarHookAntes('antesEditar', req, datosValidados, existente);
      const origenId = existente[pk];
      // UPDATE del registro y reemplazo del conjunto de N:M en una sola transacción.
      await knex.transaction(async (trx) => {
        if (Object.keys(datos).length > 0) await trx(tabla).where(pk, origenId).update(datos);
        await escribirRelaciones({ trx, relaciones, origenId });
      });
      const row = await leerCompleto(origenId);
      await registrarActividad(req, 'editar', id);
      await ejecutarHookDespues('despuesEditar', req, row);
      res.json({ status: true, data: row });
    }));

    router.delete('/:id', sso.requirePermission(permiso('eliminar')), wrap(async (req, res) => {
      const id = req.params.id;
      const existente = await buscarRegistro(req, id);
      await ejecutarHookAntes('antesEliminar', req, existente);

      if (softDelete) {
        // El UPDATE lleva el alcance como filtro: si no coincide ninguna fila, el registro no es del usuario (404).
        const alcanceReq = obtenerAlcance(req);
        let qb = knex(tabla).where(pk, id);
        if (alcanceReq !== null && Object.keys(alcanceReq).length > 0) qb = qb.where(alcanceReq);
        const afectadas = await qb.update({ [softDelete.campo]: softDelete.valor, ...softDelete.extra });
        if (afectadas === 0) throw new ErrorCrud(404, 'Registro no encontrado');
      } else {
        // Borrado físico: las filas de N:M del registro se borran en la misma transacción.
        await knex.transaction(async (trx) => {
          await borrarRelaciones({ trx, campos, origenId: existente[pk] });
          await trx(tabla).where(pk, id).delete();
        });
      }
      await registrarActividad(req, 'eliminar', id);
      await ejecutarHookDespues('despuesEliminar', req, existente);
      res.json({ status: true, data: { id } });
    }));
  }

  return router;
}

export default createCrudRouter;
