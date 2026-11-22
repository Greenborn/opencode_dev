# CRUD demo

Demo integrada de `@greenborn/express-greenborn-crud` (back), `@greenborn/vue-greenborn-crud` (front)
y `@greenborn/express-greenborn-sso-back` (RBAC con `rbac: true`).

- Backend: Express en puerto **4300**, SQLite (`backend/data/crud_demo.sqlite3`).
- Frontend: Vue 3 + Vite en puerto **5175** (proxy de `/api` a 4300).

**Importante:** el SSO es un **stub local** (`backend/src/sso.js`, `ssoClientStub`). No consume el
servicio SSO real: sólo valida los tokens de prueba de la tabla `TOKENS_PRUEBA`.

## Levantar

```bash
# 1. Backend
cd crud-demo/backend
npm install
npm run setup        # migrate + seed (usuarios, roles, permisos, productos)
npm start            # http://localhost:4300

# 2. Frontend (otra terminal)
cd crud-demo/frontend
npm install
npm run dev          # http://localhost:5175
```

Para regenerar la base desde cero: borrar `backend/data/crud_demo.sqlite3` y ejecutar `npm run setup`.

## Usuarios de prueba

| Token | Usuario | Permisos |
|-------|---------|----------|
| `token-admin-demo` | admin@demo.test | `productos.listar`, `.ver`, `.crear`, `.editar`, `.eliminar` |
| `token-sin-permisos-demo` | sinpermisos@demo.test | ninguno |

## Qué verificar

En http://localhost:5175 ingresar con cada token:

- Con `token-admin-demo`: la tabla lista los 3 productos semilla; se ven los botones de alta, editar y
  eliminar; crear, editar y eliminar funcionan y la tabla se refresca.
- Con `token-sin-permisos-demo`: no aparece ningún botón de acción. Las llamadas directas a la API
  devuelven 403.

Chequeo rápido por curl:

```bash
curl -s "http://localhost:4300/api/productos/list?unique_id=crud-demo" -H "Authorization: Bearer token-admin-demo"
curl -s -w ' HTTP %{http_code}\n' "http://localhost:4300/api/productos/list?unique_id=crud-demo" -H "Authorization: Bearer token-sin-permisos-demo"   # 403
```

El parámetro `unique_id` es requerido por el middleware del SSO (el stub lo ignora).

## Estructura

```
crud-demo/
├── backend/
│   ├── knexfile.js
│   ├── migrations/    # RBAC (roles, permisos, usuarios_roles, roles_permisos), usuarios, productos
│   ├── seeds/         # admin (todos los permisos) y sinpermisos (ninguno)
│   └── src/
│       ├── config.js  # puerto y ruta de la base
│       ├── sso.js     # createSsoAuth({ rbac: true, ssoClient: stub }) y tokens de prueba
│       ├── app.js     # /api/auth/me y /api/productos (createCrudRouter)
│       └── index.js
└── frontend/
    ├── vite.config.js # puerto 5175, proxy /api
    └── src/
        ├── api.js     # cliente axios (withCredentials), adaptador http, token
        ├── App.vue    # login con token, CrudModulo, ModalContainer
        └── main.js
```

Las dependencias `@greenborn/*` se instalan como `file:` apuntando a los paquetes del monorepo.
