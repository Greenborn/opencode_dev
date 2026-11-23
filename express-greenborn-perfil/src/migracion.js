import { normalizarCampos } from './config.js';

// Factory de migración Knex idempotente. El timestamp y el nombre del archivo
// los decide cada proyecto; este módulo sólo define el esquema.
export function createPerfilMigration({
  table = 'perfiles',
  userColumn = 'usuario_id',
  userTable = 'usuarios',
  userTablePk = 'id',
  campos,
} = {}) {
  const lista = normalizarCampos(campos);
  return {
    async up(knex) {
      if (await knex.schema.hasTable(table)) return;
      await knex.schema.createTable(table, (t) => {
        t.increments('id').primary();
        t.integer(userColumn).unsigned().notNullable().unique()
          .references(userTablePk).inTable(userTable).onDelete('CASCADE');
        for (const c of lista) {
          if (c.tipo === 'booleano' || c.interruptor) continue;
          if (c.tipo === 'numero') t.float(c.nombre).nullable();
          else if (c.tipo === 'texto_largo') t.text(c.nombre).nullable();
          else t.string(c.nombre, 255).nullable();
        }
        for (const c of lista) {
          if (c.tipo === 'booleano') t.boolean(c.nombre).notNullable().defaultTo(false);
          if (c.interruptor) t.boolean(c.interruptor).notNullable().defaultTo(false);
        }
        t.timestamps(true, true);
      });
    },
    async down(knex) {
      await knex.schema.dropTableIfExists(table);
    },
  };
}
