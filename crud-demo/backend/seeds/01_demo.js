// Usuarios de prueba: admin (todos los permisos de productos) y sin_permisos (ningún permiso).
// Los tokens de prueba los valida el ssoClient stub de src/sso.js.
export const PERMISOS_PRODUCTOS = [
  'productos.listar',
  'productos.ver',
  'productos.crear',
  'productos.editar',
  'productos.eliminar',
];

export async function seed(knex) {
  await knex('roles_permisos').del();
  await knex('usuarios_roles').del();
  await knex('productos').del();
  await knex('permisos').del();
  await knex('roles').del();
  await knex('usuarios').del();

  const [adminId] = await knex('usuarios').insert({ email: 'admin@demo.test', username: 'admin', activo: 1 });
  const [sinPermisosId] = await knex('usuarios').insert({ email: 'sinpermisos@demo.test', username: 'sinpermisos', activo: 1 });

  const [adminRolId] = await knex('roles').insert({ nombre: 'admin' });
  const [sinRolId] = await knex('roles').insert({ nombre: 'sin_permisos' });

  const permisoIds = [];
  for (const nombre of PERMISOS_PRODUCTOS) {
    const [id] = await knex('permisos').insert({ nombre });
    permisoIds.push(id);
  }

  await knex('usuarios_roles').insert([
    { usuario_id: adminId, rol_id: adminRolId },
    { usuario_id: sinPermisosId, rol_id: sinRolId },
  ]);
  await knex('roles_permisos').insert(permisoIds.map((permiso_id) => ({ rol_id: adminRolId, permiso_id })));

  await knex('productos').insert([
    { nombre: 'Remera', precio: 1500, activo: 1 },
    { nombre: 'Taza', precio: 800, activo: 1 },
    { nombre: 'Auriculares', precio: 25000, activo: 0 },
  ]);
}
