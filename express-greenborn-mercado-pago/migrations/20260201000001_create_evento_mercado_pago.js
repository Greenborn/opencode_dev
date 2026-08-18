/**
 * Tabla evento_mercado_pago: registra cada notificación (webhook) de Mercado
 * Pago. La columna UNIQUE(payment_id, payment_status) garantiza la
 * deduplicación atómica de notificaciones reenviadas por MP.
 *
 * Extraída de las migraciones de mercado_pago_iot (20251028000006 + evolución).
 * Nota: las columnas id_local_comercio / id_dispositivo / id_caja quedan NULL
 * al insertarse el webhook; el enriquecimiento/mapeo a caja/dispositivo/local
 * lo hace el procesador del host (no parte de este paquete por ahora).
 */
export async function up(knex) {
  const exists = await knex.schema.hasTable('evento_mercado_pago');
  if (exists) return;

  await knex.schema.createTable('evento_mercado_pago', (table) => {
    table.increments('id_evento_mercado_pago').primary();
    table.timestamp('creado_el').notNullable().defaultTo(knex.fn.now());
    table.json('json').nullable();
    table.integer('id_local_comercio').unsigned().nullable();
    table.integer('id_dispositivo').unsigned().nullable();
    table.integer('id_caja').unsigned().nullable();
    table.json('info_extra').nullable();
    table.string('payment_id', 36).notNullable().defaultTo('');
    table.string('payment_status', 36).notNullable().defaultTo('');
    table.boolean('procesado').notNullable().defaultTo(false);
    table.timestamp('procesado_el').nullable();
    table.integer('intentos').notNullable().defaultTo(0);
    table.unique(['payment_id', 'payment_status'], 'uq_evento_mercado_pago_payment');
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('evento_mercado_pago');
}