import { computed, reactive, ref, unref } from 'vue'
import { BtnConfig } from '@greenborn/vue-table-editor'
import { useModal } from '@greenborn/vue-greenborn-modal-manager'
import {
  validarConfig,
  combinarFiltros,
  construirFiltrosAvanzados,
  operadoresDeFiltro,
  pageSizeAceptado,
  opcionesTamanoPagina,
  resolverAyuda,
  crearAdaptadorPreferencias,
  tienePermiso,
  normalizarAcciones,
  accionPermitida,
  normalizarFormulario,
  construirParametrosFormulario,
  procesarGuardado,
  camposFormulario,
  combinarOpciones,
  fieldsDefDesdeCampos,
  formateadoresCeldas,
  extraerError,
  esRespuestaFallida,
  requerido,
  valoresIniciales,
} from '../helpers.js'
import FormCrud from '../components/FormCrud.vue'
import FormCrudFooter from '../components/FormCrudFooter.vue'

/**
 * Lógica CRUD: API para TableEditor (modo lazy), formularios, confirmaciones,
 * y botones de toolbar/fila habilitados según permisos.
 *
 * @param {Object} opts
 * @param {string} opts.recurso              Base de los permisos (`<recurso>.<accion>`).
 * @param {string} opts.endpoint             Base de las rutas del back (ej. '/api/productos').
 * @param {Object} opts.http                 { get, post, put, delete } que devuelven la data.
 * @param {string[]|Ref<string[]>} opts.permisos
 * @param {Array|Ref<Array>} [opts.campos]   Definiciones de campos; si no, se usa fields_def del list.
 * @param {string} [opts.pk]                 Clave primaria para editar/eliminar.
 * @param {Object} [opts.elemento]           { singular, gender }.
 * @param {Array} [opts.accionesExtra]       [{ key, label, icon, severity, permiso?, onClick(fila) }].
 * @param {Object} [opts.logger]             Logger con error().
 * @param {Object} [opts.preferencias]       Dependencia inyectada { leer(clave), guardar(clave, valor) } para orden/ancho/visibilidad
 *                                           de columnas. Si no se pasa, TableEditor usa su adaptador global (localStorage por defecto).
 * @param {Object} [opts.ayuda]              Configuración de ayuda: { clave, botones: { listar, crear, editar, eliminar, campo } }.
 * @param {Object|Ref<Object>} [opts.acciones] { crear, editar, eliminar, listar } booleanos; por defecto todas true.
 * @param {Object|Ref<Object>} [opts.formulario] { componente, footer? } formulario personalizado en lugar de FormCrud.
 */
export function useCrud(opts) {
  validarConfig({ recurso: opts.recurso, endpoint: opts.endpoint, http: opts.http, permisos: unref(opts.permisos) })
  // Validación explícita al crear (lanza si la configuración es inválida) y reactividad si cambia.
  const accionesActuales = computed(() => normalizarAcciones(unref(opts.acciones)))
  accionesActuales.value
  const formularioPersonalizado = computed(() => normalizarFormulario(unref(opts.formulario)))
  formularioPersonalizado.value
  const pk = opts.pk === undefined ? 'id' : opts.pk
  const adaptadorPreferencias = crearAdaptadorPreferencias(opts.preferencias, opts.recurso)
  const ayudaResuelta = resolverAyuda(opts.ayuda, { recurso: opts.recurso })
  // Paginación que informa el back (data.paginacion en /list); null hasta la primera respuesta.
  const paginacion = ref(null)
  // Controles de filtros avanzados (estado de la UI) y filtros ya aplicados (se envían a /list).
  const filtrosEstado = reactive({})
  const filtrosAplicados = ref({})
  const errorFiltros = ref('')
  const { mostrar_modal, mostrar_alerta, mostrar_confirm } = useModal()
  const http = opts.http
  const endpoint = opts.endpoint
  const singular = computed(() => {
    const elem = unref(opts.elemento)
    return elem === undefined || elem === null || elem.singular === undefined ? 'Registro' : elem.singular
  })
  function extrasActuales() {
    const lista = unref(opts.accionesExtra)
    return lista === undefined || lista === null ? [] : lista
  }

  const camposDeLista = ref(null)
  const tablaRef = ref(null)

  // Campos del servidor con operadores de filtro (fuente de verdad de los controles).
  const filtrosDisponibles = computed(() => {
    const lista = camposDeLista.value
    if (lista === null) return []
    return lista.filter((c) => operadoresDeFiltro(c).length > 0)
  })

  function asegurarEstadoFiltros(defs) {
    for (const campo of defs) {
      if (operadoresDeFiltro(campo).length === 0) continue
      if (filtrosEstado[campo.field] === undefined) {
        filtrosEstado[campo.field] = { op: '', valor: '', desde: '', hasta: '' }
      }
    }
  }

  function aplicarFiltros() {
    errorFiltros.value = ''
    try {
      filtrosAplicados.value = construirFiltrosAvanzados(filtrosDisponibles.value, filtrosEstado)
    } catch (err) {
      console.error('[crud] filtros inválidos:', err)
      errorFiltros.value = err.message
      return
    }
    refresh()
  }

  function limpiarFiltros() {
    for (const clave of Object.keys(filtrosEstado)) {
      filtrosEstado[clave] = { op: '', valor: '', desde: '', hasta: '' }
    }
    filtrosAplicados.value = {}
    errorFiltros.value = ''
    refresh()
  }

  const permisosActuales = computed(() => unref(opts.permisos))
  const puede = (accion) => accionPermitida(accionesActuales.value, permisosActuales.value, opts.recurso, accion)

  function hayCamposFijos() {
    const explicitos = unref(opts.campos)
    return explicitos !== undefined && explicitos !== null
  }

  // Campos en uso. Si se pasan `campos`, mandan; las `options` que no traen
  // se completan con las del fields_def del servidor (por nombre de campo).
  const camposEfectivos = computed(() => {
    if (hayCamposFijos()) return combinarOpciones(unref(opts.campos), camposDeLista.value)
    return camposDeLista.value
  })

  function refresh() {
    if (tablaRef.value === null) return
    tablaRef.value.refresh()
  }

  function setTabla(tabla) {
    tablaRef.value = tabla
  }

  function reportarError(contexto, err) {
    console.error(`[crud] ${contexto}:`, err)
    const { message } = extraerError(err)
    mostrar_alerta(message)
  }

  // ── API para TableEditor (modo lazy) ─────────────────────────
  // Parámetros que envía TableEditor (lazyProtocol 'standard'):
  // page, pageSize, sortField, sortOrder, search, filters (JSON string).
  const api = {
    list: async (params) => {
      try {
        requerido(params, 'params')
        // pageSize: sólo valores que el back acepta; filters: combina TableEditor con los filtros avanzados.
        const { pageSize, filters, ...resto } = params
        const consulta = { ...resto }
        const tamano = pageSizeAceptado(pageSize, paginacion.value)
        if (tamano !== undefined) consulta.pageSize = tamano
        const filtro = combinarFiltros(filters, filtrosAplicados.value)
        if (filtro !== undefined) consulta.filters = filtro
        const res = await http.get(`${endpoint}/list`, { params: consulta })
        if (esRespuestaFallida(res)) {
          mostrar_alerta(extraerError(res).message)
          return res
        }
        // Se guarda siempre: con `campos` fijos sirve para completar las options.
        const fieldsDef = res.data.fields_def
        if (fieldsDef !== undefined) {
          camposDeLista.value = fieldsDef
          asegurarEstadoFiltros(fieldsDef)
        }
        if (res.data.paginacion !== undefined) paginacion.value = res.data.paginacion
        return res
      } catch (err) {
        reportarError('error al listar', err)
        return { status: false, message: extraerError(err).message }
      }
    },
  }

  // ── Formularios ──────────────────────────────────────────────
  async function ejecutar(modo, id, payload) {
    if (modo === 'crear') {
      return http.post(endpoint, payload)
    }
    if (modo === 'editar') {
      requerido(id, 'id')
      return http.put(`${endpoint}/${id}`, payload)
    }
    throw new Error(`[crud] modo de formulario inválido: ${modo}`)
  }

  // Guardado compartido con formularios personalizados: POST/PUT, errores, refresco y cierre.
  async function guardarFormulario(modo, id, camposForm, valoresRecibidos, estado, codigoModal) {
    const resultado = await procesarGuardado({
      campos: camposForm,
      valores: valoresRecibidos,
      modo,
      id,
      ejecutar,
      alEnviar: () => {
        estado.guardando = true
      },
    })
    estado.guardando = false
    estado.errores = resultado.errores
    estado.errorGeneral = resultado.errorGeneral
    if (resultado.ok) {
      ocultar_modal(codigoModal())
      mostrar_alerta(`${singular.value} guardado correctamente.`)
      refresh()
    }
    return resultado
  }

  function abrirFormulario(modo, fila) {
    const campos = camposEfectivos.value
    if (campos === null) {
      mostrar_alerta('Todavía no hay definición de campos. Actualizá la tabla e intentá de nuevo.')
      return
    }
    const id = modo === 'editar' ? fila[pk] : undefined
    const estado = reactive({
      guardar: null,
      guardando: false,
      errores: {},
      errorGeneral: '',
    })
    const nombre = singular.value.toLowerCase()
    const titulo = modo === 'crear' ? `Nuevo ${nombre}` : `Editar ${nombre}`
    const personalizado = formularioPersonalizado.value
    if (personalizado !== null) {
      abrirFormularioPersonalizado(personalizado, modo, id, fila, campos, estado, titulo)
      return
    }
    const parametros = {
      campos: camposFormulario(campos),
      ayudaCampos: ayudaResuelta.campos,
      fila: fila === undefined ? null : fila,
      modo,
      id,
      singular: singular.value,
      ejecutar,
      onGuardado: () => {
        mostrar_alerta(`${singular.value} guardado correctamente.`)
        refresh()
      },
      _modalState: estado,
    }
    mostrar_modal({ body: FormCrud, footer: FormCrudFooter }, titulo, parametros, { size: 'md' })
  }

  function abrirFormularioPersonalizado(personalizado, modo, id, fila, campos, estado, titulo) {
    const camposForm = camposFormulario(campos)
    const valores = reactive(valoresIniciales(camposForm, fila))
    let codigoModal = null
    const guardar = (valoresRecibidos) => guardarFormulario(modo, id, camposForm, valoresRecibidos, estado, () => codigoModal)
    // El footer por defecto (FormCrudFooter) llama a _modalState.guardar() sin argumentos.
    estado.guardar = () => guardar(valores)
    const parametros = construirParametrosFormulario({
      modo,
      fila: modo === 'editar' ? fila : null,
      campos: camposForm,
      valores,
      guardar,
      modalState: estado,
    })
    const footer = personalizado.footer === null ? FormCrudFooter : personalizado.footer
    const { code } = mostrar_modal({ body: personalizado.componente, footer }, titulo, parametros, { size: 'md' })
    codigoModal = code
  }

  function abrirCrear() {
    if (!puede('crear')) return
    abrirFormulario('crear')
  }

  function abrirEditar(fila) {
    if (!puede('editar')) return
    requerido(fila, 'fila')
    abrirFormulario('editar', fila)
  }

  function confirmarEliminar(fila) {
    if (!puede('eliminar')) return
    requerido(fila, 'fila')
    const id = requerido(fila[pk], `fila.${pk}`)
    mostrar_confirm({
      title: 'Eliminar',
      text: `¿Eliminar ${singular.value.toLowerCase()} (${pk}: ${id})? Esta acción no se puede deshacer.`,
      severity_confirmar: 'danger',
      confirmar_accion: async () => {
        try {
          const res = await http.delete(`${endpoint}/${id}`)
          if (esRespuestaFallida(res)) {
            mostrar_alerta(extraerError(res).message)
            return
          }
          mostrar_alerta(`${singular.value} eliminado.`)
          refresh()
        } catch (err) {
          reportarError('error al eliminar', err)
        }
      },
    })
  }

  // ── Selección y botones ─────────────────────────────────────
  const seleccion = ref(null)
  function onRowSelected(valor) {
    seleccion.value = Array.isArray(valor) || valor === undefined ? null : valor
  }

  const toolbarButtons = computed(() => {
    const btns = []
    if (puede('crear')) {
      btns.push(new BtnConfig({
        key: 'crud-crear', icon: 'plus', severity: 'success', label: 'Nuevo',
        helpKey: ayudaResuelta.botones.crear,
        onClick: () => abrirCrear(),
      }))
    }
    if (puede('editar')) {
      btns.push(new BtnConfig({
        key: 'crud-editar', icon: 'pencil', severity: 'warning', label: 'Editar',
        helpKey: ayudaResuelta.botones.editar,
        isDisabled: () => seleccion.value === null,
        onClick: () => abrirEditar(seleccion.value),
      }))
    }
    if (puede('eliminar')) {
      btns.push(new BtnConfig({
        key: 'crud-eliminar', icon: 'trash', severity: 'danger', label: 'Eliminar',
        helpKey: ayudaResuelta.botones.eliminar,
        isDisabled: () => seleccion.value === null,
        onClick: () => confirmarEliminar(seleccion.value),
      }))
    }
    return btns
  })

  const rowButtons = computed(() => {
    const btns = []
    if (puede('editar')) {
      btns.push(new BtnConfig({
        key: 'crud-fila-editar', icon: 'pencil', severity: 'outline-warning', label: 'Editar',
        helpKey: ayudaResuelta.botones.editar,
        onClick: (fila) => abrirEditar(fila),
      }))
    }
    if (puede('eliminar')) {
      btns.push(new BtnConfig({
        key: 'crud-fila-eliminar', icon: 'trash', severity: 'outline-danger', label: 'Eliminar',
        helpKey: ayudaResuelta.botones.eliminar,
        onClick: (fila) => confirmarEliminar(fila),
      }))
    }
    for (const extra of extrasActuales()) {
      requerido(extra.key, 'accionesExtra[].key')
      if (extra.permiso !== undefined && !tienePermiso(permisosActuales.value, extra.permiso)) continue
      btns.push(new BtnConfig({
        key: `extra-${extra.key}`,
        icon: extra.icon,
        severity: extra.severity,
        label: extra.label,
        onClick: (fila) => extra.onClick(fila),
      }))
    }
    return btns
  })

  function generoDe() {
    const elem = unref(opts.elemento)
    return elem === undefined || elem === null || elem.gender === undefined ? 'M' : elem.gender
  }

  const tableConfig = computed(() => {
    const config = {
      lazy: true,
      infiniteScroll: false,
      selectionMode: 'single',
      elementName: { singular: singular.value, gender: generoDe() },
      dataPipeline: {
        processFields: (fieldsDef) => {
          const campos = camposEfectivos.value
          const defs = campos === null ? fieldsDef : fieldsDefDesdeCampos(campos)
          return defs.map((d) => (ayudaResuelta.campos[d.field] === undefined ? d : { ...d, helpKey: ayudaResuelta.campos[d.field] }))
        },
      },
    // Lookups (<campo>_etiqueta), multiselect (labels) y escapado de texto.
    valueFormatters: formateadoresCeldas(camposEfectivos.value),
    buttons: {
      toolbar: toolbarButtons.value,
      rowActions: rowButtons.value,
    },
    };
    if (paginacion.value !== null) {
      config.pageSize = pageSizeAceptado(undefined, paginacion.value)
      config.pageSizeOptions = opcionesTamanoPagina(paginacion.value)
    }
    if (adaptadorPreferencias !== null) config.preferencesStore = adaptadorPreferencias
    return config
  })

  return {
    api,
    tableConfig,
    puede,
    permisosActuales,
    camposEfectivos,
    puedeListar: computed(() => puede('listar')),
    accionesActuales: computed(() => accionesActuales.value),
    onRowSelected,
    setTabla,
    refresh,
    filtrosDisponibles,
    filtrosEstado,
    errorFiltros,
    aplicarFiltros,
    limpiarFiltros,
    paginacion,
    ayudaResuelta,
    abrirCrear,
    abrirEditar,
    confirmarEliminar,
    ejecutar,
  }
}
