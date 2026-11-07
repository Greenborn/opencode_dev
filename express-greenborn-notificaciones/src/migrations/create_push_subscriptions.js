/**
 * Migración factory (no es un archivo de migración Knex por sí sola): el
 * consumidor debe envolverla en su propia migración con timestamp, ej.
 *
 *   import { createPushSubscriptionsMigration } from 'express-greenborn-notificaciones/migrations';
 *   export const { up, down } = createPushSubscriptionsMigration();
 *
 * o copiar este archivo a su carpeta de migraciones con el nombre/timestamp
 * que use su proyecto. Es idempotente (usa hasTable/hasColumn).
 */
export function createPushSubscriptionsMigration(opts = {}) {
  const {
    table = 'push_subscriptions',
    userColumn = 'usuario_id',
    userTable = 'usuarios',
    userTablePk = 'id',
  } = opts;

  async function up(knex) {
    const existe = await knex.schema.hasTable(table);
    if (existe) return;

    await knex.schema.createTable(table, (t) => {
      t.increments('id').primary();
      t.integer(userColumn).unsigned().notNullable()
        .references(userTablePk).inTable(userTable).onDelete('CASCADE');
      t.string('endpoint', 1024).notNullable();
      t.string('p256dh', 255).notNullable();
      t.string('auth', 255).notNullable();
      t.string('user_agent', 255).nullable();
      t.timestamps(true, true);
      t.index(userColumn);
    });
  }

  async function down(knex) {
    await knex.schema.dropTableIfExists(table);
  }

  return { up, down };
}
