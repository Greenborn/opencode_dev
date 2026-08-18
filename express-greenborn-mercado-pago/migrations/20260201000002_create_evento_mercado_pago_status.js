/**
 * Tabla de catálogo de estados de pago de Mercado Pago (approved, pending,
 * rejected, etc.). Alimentada por el host/procesador a partir de los eventos.
 */
export async function up(knex) {
  const exists = await knex.schema.hasTable('evento_mercado_pago_status');
  if (exists) return;

  await knex.schema.createTable('evento_mercado_pago_status', (table) => {
    table.increments('id_status').primary();
    table.string('value', 36).notNullable().unique();
    table.string('label', 64).notNullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('evento_mercado_pago_status');
}