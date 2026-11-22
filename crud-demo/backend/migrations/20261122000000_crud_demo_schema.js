// Esquema RBAC mínimo con los nombres por defecto de express-greenborn-sso-back (src/rbac.js)
// más la tabla de dominio `productos` y `usuarios` (email de la identidad SSO).
export async function up(knex) {
  await knex.schema.createTable('usuarios', (t) => {
    t.increments('id').primary();
    t.string('email', 255).notNullable().unique();
    t.string('username', 255).notNullable();
    t.integer('activo').notNullable().defaultTo(1);
  });

  await knex.schema.createTable('roles', (t) => {
    t.increments('id').primary();
    t.string('nombre', 100).notNullable().unique();
  });

  await knex.schema.createTable('permisos', (t) => {
    t.increments('id').primary();
    t.string('nombre', 150).notNullable().unique();
  });

  await knex.schema.createTable('usuarios_roles', (t) => {
    t.integer('usuario_id').notNullable().references('id').inTable('usuarios').onDelete('CASCADE');
    t.integer('rol_id').notNullable().references('id').inTable('roles').onDelete('CASCADE');
    t.primary(['usuario_id', 'rol_id']);
  });

  await knex.schema.createTable('roles_permisos', (t) => {
    t.integer('rol_id').notNullable().references('id').inTable('roles').onDelete('CASCADE');
    t.integer('permiso_id').notNullable().references('id').inTable('permisos').onDelete('CASCADE');
    t.primary(['rol_id', 'permiso_id']);
  });

  await knex.schema.createTable('productos', (t) => {
    t.increments('id').primary();
    t.string('nombre', 255).notNullable();
    t.decimal('precio', 12, 2).notNullable();
    t.integer('activo').notNullable().defaultTo(1);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('productos');
  await knex.schema.dropTableIfExists('roles_permisos');
  await knex.schema.dropTableIfExists('usuarios_roles');
  await knex.schema.dropTableIfExists('permisos');
  await knex.schema.dropTableIfExists('roles');
  await knex.schema.dropTableIfExists('usuarios');
}
