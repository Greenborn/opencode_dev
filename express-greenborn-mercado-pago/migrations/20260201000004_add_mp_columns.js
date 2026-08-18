/**
 * Columnas de Mercado Pago sobre las tablas del host (caja y local_comercio).
 *
 * En el backend de origen estas columnas viven en las tablas `caja` y
 * `local_comercio` AQUELLAS que el propio host posee; aquí se exponen como
 * migración de referencia, defensiva e idempotente (agrega la columna solo si
 * existe la tabla y la columna NO existe). El host puede copiarla o usarla
 * directamente si su esquema coincide (ver SCHEMA.md de mercado_pago_iot).
 */
export async function up(knex) {
  await ensureColumn(knex, 'caja', 'mp_pos_id', (t) => t.string('mp_pos_id', 100).nullable());
  await ensureColumn(knex, 'caja', 'mp_external_pos_id', (t) => t.string('mp_external_pos_id', 100).nullable());
  await ensureColumn(knex, 'caja', 'mp_pos_status', (t) => t.string('mp_pos_status', 50).nullable());
  await ensureColumn(knex, 'caja', 'mp_pos_data', (t) => t.json('mp_pos_data').nullable());
  await ensureColumn(knex, 'caja', 'qr_data', (t) => t.text('qr_data').nullable());
  await ensureColumn(knex, 'caja', 'qr_image_url', (t) => t.string('qr_image_url', 500).nullable());
  await ensureColumn(knex, 'caja', 'qr_expiracion', (t) => t.timestamp('qr_expiracion').nullable());
  await ensureColumn(knex, 'caja', 'renovacion_qr_activa', (t) => t.boolean('renovacion_qr_activa').notNullable().defaultTo(knex.raw('0')));
  await ensureColumn(knex, 'caja', 'mp_order_data', (t) => t.json('mp_order_data').nullable());
  await ensureColumn(knex, 'caja', 'monto', (t) => t.double('monto').nullable());

  await ensureColumn(knex, 'local_comercio', 'mp_store_id', (t) => t.integer('mp_store_id').nullable());
  await ensureColumn(knex, 'local_comercio', 'mp_external_store_id', (t) => t.string('mp_external_store_id', 100).nullable());
  await ensureColumn(knex, 'local_comercio', 'mp_store_status', (t) => t.string('mp_store_status', 50).nullable());
  await ensureColumn(knex, 'local_comercio', 'mp_store_data', (t) => t.text('mp_store_data').nullable());
  await ensureColumn(knex, 'local_comercio', 'mp_pos_id', (t) => t.integer('mp_pos_id').nullable());
  await ensureColumn(knex, 'local_comercio', 'mp_external_pos_id', (t) => t.string('mp_external_pos_id', 100).nullable());
  await ensureColumn(knex, 'local_comercio', 'mp_pos_status', (t) => t.string('mp_pos_status', 50).nullable());
  await ensureColumn(knex, 'local_comercio', 'mp_pos_data', (t) => t.json('mp_pos_data').nullable());
}

export async function down(knex) {
  const drops = [
    ['caja', 'mp_pos_id'], ['caja', 'mp_external_pos_id'], ['caja', 'mp_pos_status'],
    ['caja', 'mp_pos_data'], ['caja', 'qr_data'], ['caja', 'qr_image_url'],
    ['caja', 'qr_expiracion'], ['caja', 'renovacion_qr_activa'], ['caja', 'mp_order_data'],
    ['caja', 'monto'],
    ['local_comercio', 'mp_store_id'], ['local_comercio', 'mp_external_store_id'],
    ['local_comercio', 'mp_store_status'], ['local_comercio', 'mp_store_data'],
    ['local_comercio', 'mp_pos_id'], ['local_comercio', 'mp_external_pos_id'],
    ['local_comercio', 'mp_pos_status'], ['local_comercio', 'mp_pos_data'],
  ];
  for (const [table, column] of drops) {
    const hasTable = await knex.schema.hasTable(table);
    if (!hasTable) continue;
    const hasColumn = await knex.schema.hasColumn(table, column);
    if (hasColumn) {
      await knex.schema.alterTable(table, (t) => t.dropColumn(column));
    }
  }
}

async function ensureColumn(knex, table, column, define) {
  const hasTable = await knex.schema.hasTable(table);
  if (!hasTable) return;
  const hasColumn = await knex.schema.hasColumn(table, column);
  if (!hasColumn) {
    await knex.schema.alterTable(table, define);
  }
}