/**
 * Tabla galeria_imagenes: una única colección de imágenes de la galería.
 * Guarda metadatos (título, descripción, sección, orden) y la referencia a
 * los archivos en disco: filename (original) y thumbnail_filename (JPEG
 * generado con sharp, nullable porque los SVG no se rasterizan).
 * Idempotente: si la tabla ya existe, no hace nada.
 */
export async function up(knex) {
  const existe = await knex.schema.hasTable('galeria_imagenes');
  if (existe) return;

  await knex.schema.createTable('galeria_imagenes', (table) => {
    table.increments('id').primary();
    table.string('titulo', 255).nullable();
    table.text('descripcion').nullable();
    table.string('seccion', 100).nullable().index();
    table.string('filename', 255).notNullable();
    table.string('thumbnail_filename', 255).nullable();
    table.string('original_name', 255).nullable();
    table.string('mime_type', 100).notNullable();
    table.bigInteger('size').nullable();
    table.integer('width').nullable();
    table.integer('height').nullable();
    table.integer('orden').notNullable().defaultTo(0);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('galeria_imagenes');
}
