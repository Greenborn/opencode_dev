// Repositorio Knex por defecto. Interfaz que consume el router:
//   listarPorPropietario(userId)          -> filas
//   obtener(id)                           -> fila | null
//   crear(datos)                          -> fila
//   actualizar(id, cambios)               -> fila | null
//   eliminar(id)                          -> boolean
//   listarPublicados(filtros)             -> filas (publicado = true)
export function createKnexLocalesRepo({ db, table = 'locales', propietarioColumn = 'propietario_id' }) {
  return {
    async listarPorPropietario(userId) {
      return db(table).where(propietarioColumn, userId).orderBy('id');
    },
    async obtener(id) {
      return (await db(table).where({ id }).first()) || null;
    },
    async crear(datos) {
      const [id] = await db(table).insert(datos);
      return db(table).where({ id }).first();
    },
    async actualizar(id, cambios) {
      if (Object.keys(cambios).length) await db(table).where({ id }).update(cambios);
      return (await db(table).where({ id }).first()) || null;
    },
    async eliminar(id) {
      return (await db(table).where({ id }).del()) > 0;
    },
    async listarPublicados({ ciudad } = {}) {
      const q = db(table).where({ publicado: true }).orderBy('id');
      if (ciudad) q.where('ciudad', ciudad);
      return q;
    },
  };
}
