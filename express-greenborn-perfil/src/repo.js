// Repositorio Knex por defecto. El router sólo depende de la interfaz:
//   obtenerPorUsuario(userId) -> fila | null
//   obtenerPorId(id)          -> fila | null
//   crear(userId)             -> fila
//   actualizar(userId, cambios) -> fila | null
export function createKnexPerfilRepo({ db, table = 'perfiles', userColumn = 'usuario_id', campos }) {
  const defaults = Object.fromEntries(
    campos.filter((c) => c.interruptor).map((c) => [c.interruptor, false]),
  );
  return {
    async obtenerPorUsuario(userId) {
      return (await db(table).where(userColumn, userId).first()) || null;
    },
    async obtenerPorId(id) {
      return (await db(table).where({ id }).first()) || null;
    },
    async crear(userId) {
      const [id] = await db(table).insert({ [userColumn]: userId, ...defaults });
      return db(table).where({ id }).first();
    },
    async actualizar(userId, cambios) {
      if (Object.keys(cambios).length) {
        await db(table).where(userColumn, userId).update(cambios);
      }
      return (await db(table).where(userColumn, userId).first()) || null;
    },
  };
}
