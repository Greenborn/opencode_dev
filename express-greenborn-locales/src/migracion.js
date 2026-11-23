import { normalizarCamposLocal } from './config.js';

// Migración Knex idempotente. El timestamp y el nombre del archivo los decide
// cada proyecto.
export function createLocalesMigration({
  table = 'locales',
  propietarioColumn = 'propietario_id',
  propietarioTable = 'usuarios',
  propietarioPk = 'id',
  camposExtra = [],
} = {}) {
  const { campos } = normalizarCamposLocal(camposExtra);
  return {
    async up(knex) {
      if (await knex.schema.hasTable(table)) return;
      await knex.schema.createTable(table, (t) => {
        t.increments('id').primary();
        t.integer(propietarioColumn).unsigned().notNullable()
          .references(propietarioPk).inTable(propietarioTable).onDelete('CASCADE');
        t.boolean('publicado').notNullable().defaultTo(false);
        for (const c of campos) {
          if (c.tipo === 'numero') t.float(c.nombre).nullable();
          else if (c.tipo === 'texto_largo') t.text(c.nombre).nullable();
          else t.string(c.nombre, 255).nullable();
        }
        t.timestamps(true, true);
        t.index([propietarioColumn]);
      });
    },
    async down(knex) {
      await knex.schema.dropTableIfExists(table);
    },
  };
}
