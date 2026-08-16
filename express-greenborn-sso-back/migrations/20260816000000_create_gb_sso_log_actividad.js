export function up(knex) {
  return knex.schema.createTable('gb_sso_log_actividad', (t) => {
    t.increments('id').primary();
    t.timestamp('fecha_hora').notNullable().defaultTo(knex.fn.now());
    t.string('endpoint', 512).notNullable();
    t.bigInteger('id_usuario').nullable();
    t.string('metodo', 10).notNullable();
    t.string('ipv4', 45).nullable();
    t.string('ipv6', 45).nullable();
    t.json('datos_entrada').nullable();
    t.index(['fecha_hora']);
  });
}

export function down(knex) {
  return knex.schema.dropTableIfExists('gb_sso_log_actividad');
}

export default { up, down };
