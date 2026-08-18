/**
 * Tabla preferencia_pago_generada: QR de pago a demanda generado por el host
 * (monto variable) para una caja/POS. Forma parte del ecosistema MP y se
 * incluye aquí para que el paquete pueda, a futuro, absorver la creación de
 * preferencias a demanda sin requerir migraciones externas adicionales.
 */
export async function up(knex) {
  const exists = await knex.schema.hasTable('preferencia_pago_generada');
  if (exists) return;

  await knex.schema.createTable('preferencia_pago_generada', (table) => {
    table.increments('id_preferencia_generada').primary();
    table.integer('id_caja').unsigned().nullable();
    table.integer('id_local_comercio').unsigned().nullable();
    table.integer('id_dispositivo').unsigned().nullable();
    table.string('external_reference', 100).nullable();
    table.double('monto').nullable();
    table.string('descripcion', 500).nullable();
    table.string('mp_order_id', 100).nullable();
    table.json('mp_order_data').nullable();
    table.text('qr_data').nullable();
    table.string('qr_image_url', 500).nullable();
    table.enu('estado', ['PENDIENTE', 'PAGADA', 'EXPIRADA', 'CANCELADA']).notNullable().defaultTo('PENDIENTE');
    table.timestamp('expiracion').nullable();
    table.string('mp_payment_id', 100).nullable();
    table.json('mp_payment_data').nullable();
    table.timestamp('pagado_el').nullable();
    table.timestamp('creado_el').notNullable().defaultTo(knex.fn.now());
    table.timestamp('modificado_el').notNullable().defaultTo(knex.fn.now());
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('preferencia_pago_generada');
}