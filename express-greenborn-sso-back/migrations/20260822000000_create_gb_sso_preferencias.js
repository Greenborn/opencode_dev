// Preferencias de usuario del SSO (clave/valor por usuario, valor en JSON serializado).
// Se guarda como texto JSON para ser portable entre SQLite y MySQL.
export function up(knex) {
  return knex.schema.createTable('gb_sso_preferencias', (t) => {
    t.increments('id').primary();
    t.string('user_id', 64).notNullable();
    t.string('clave', 191).notNullable();
    t.text('valor').notNullable();
    t.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    t.unique(['user_id', 'clave']);
  });
}

export function down(knex) {
  return knex.schema.dropTableIfExists('gb_sso_preferencias');
}

export default { up, down };
