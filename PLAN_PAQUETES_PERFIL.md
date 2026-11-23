# Plan: paquetes de perfil de usuario y locales (@greenborn)

> Origen: extracción desde `profesionales.top` (`/media/debian/Datos_EX4/Trabajo/Greenborn/profesionales.top`).
> Alcance de esta primera etapa: **perfil de usuario** y **locales**. Quedan fuera **privacidad/ARCO** y **preferencias** (se planifican después).
> Estado: plan. No se creó ningún paquete todavía.

## 1. Decisiones de alcance

- **Fuera de alcance**: matrícula (`MatriculaForm`, `MarcaMatricula` y cualquier campo o endpoint asociado).
- **Término configurable**: la palabra que se muestra al usuario para la entidad que tiene locales (hoy "profesional" en profesionales.top) se define por configuración. El valor por defecto es **"negocio"**. Ningún texto visible de los paquetes puede tener "profesional" fijo.
- **Incluido**:
  - Perfil de usuario: datos personales, imagen de perfil, portada, contactos con interruptor de privacidad por dato, y cuenta.
  - Locales: CRUD, ubicación en mapa, publicación por local y vista "Locales y mapa".
- **Pendiente de confirmar**: el domicilio de trabajo (`DomicilioForm`) hoy pertenece al perfil profesional. Propuesta: tratarlo como parte de **locales** (cada local tiene su dirección) y no como dato del perfil de usuario. Si se quiere mantener en el perfil, se agrega al paquete de perfil con el mismo mecanismo de interruptores.

## 2. Paquetes propuestos

| Paquete | Lado | Contenido |
|---|---|---|
| `@greenborn/express-greenborn-perfil` | back | Endpoints de perfil propio y público. Lista blanca de salida (`dtoPublico`) con interruptor por campo, apagado por defecto. Auth inyectada (no depende de `sso-back`). |
| `@greenborn/express-greenborn-locales` | back | CRUD de locales con dirección y coordenadas, publicación por local, y respuesta pública filtrada. |
| `@greenborn/vue-greenborn-perfil` | front | Layout con pestañas (informacion, contacto, cuenta), vista pública, editor de imagen y portada, y componente de interruptor de privacidad. |
| `@greenborn/vue-greenborn-locales-mapa` | front | Lista de locales, mapa (envuelve `vue-greenborn-map-viewer`), "cómo llegar" y resaltado de punto. Editor de local con `vue-greenborn-map-selector`. |

Reutilizados, no se reempaquetan: `express-greenborn-sso-back`, `express-greenborn-galeria-image` (imágenes), `vue-greenborn-map-viewer`, `vue-greenborn-map-selector`, `vue-greenborn-modal-manager`.

## 3. Configuración de los paquetes (sin texto fijo)

Cada paquete recibe por parámetro, sin valores hardcodeados:

- `terminos.entidad` — singular y plural, por defecto `negocio` / `negocios`. Se usa en títulos, etiquetas, rutas de ayuda y mensajes.
- `campos.perfil` — esquema de campos del perfil (nombre, descripción, contactos, etc.) con etiqueta, tipo y si es público por defecto.
- `campos.local` — esquema de campos del local (dirección, coordenadas, horario, etc.).
- `auth` — función `authMiddleware` inyectada.
- `storage` — adaptador de imágenes (por defecto, `express-greenborn-galeria-image`).

El paquete no conoce "matrícula" ni otros campos del dominio: esos viven en la app consumidora.

## 4. Privacidad (aplica a ambos paquetes)

Tomado de `DIRECTIVAS_PRIVACIDAD_Y_SEGURIDAD.md`:

1. Todo dato personal opcional es **privado por defecto**, con interruptor propio.
2. La salida pública es una **lista blanca**. Un campo no habilitado no se envía, ni vacío, ni en el mapa, ni en búsquedas.
3. Toda consulta de perfil propio filtra por `req.user.id`. Un usuario no puede leer ni escribir el perfil de otro.
4. El paquete de locales no expone coordenadas de locales no publicados.

## 5. Mapa de extracción desde profesionales.top

| Origen | Destino |
|---|---|
| `ProfileView.vue` (pestañas, secciones, vista pública) | `vue-greenborn-perfil` |
| `components/perfil/ContactosForm.vue`, `ContactosPerfil.vue` | `vue-greenborn-perfil` (interruptor por contacto) |
| `components/perfil/ImagenPerfilProfesional.vue`, `EditorImagen*`, `RecorteImagen.vue`, `CabeceraPerfilPublico.vue`, `TarjetaDuenoPerfil.vue`, `BotonCompartirPerfil.vue` | `vue-greenborn-perfil` |
| `controllers/miPerfilController.js` (perfil, imagen, portada, contactos) | `express-greenborn-perfil` |
| `components/perfil/LocalesPerfil.vue`, `LocalesComerciales.vue` | `vue-greenborn-locales-mapa` |
| `controllers/` de locales y `utils/enlacesMapa` | `express-greenborn-locales` y `vue-greenborn-locales-mapa` |
| Migraciones `perfil_*` y `locales_*` | Migraciones dentro de cada paquete back (`knex`), con nombres genéricos |

Excluido de la extracción: `MatriculaForm.vue`, `MarcaMatricula.vue`, campos de matrícula en migraciones y controladores, y textos legales.

## 6. Reglas del monorepo que aplican

Según `greenborn_1/AGENTS.md`:

- Scope `@greenborn/` y publicación en npm con versión inicial `0.1.0`.
- Agregar cada paquete a `PAQUETES.md`.
- Revisar `PROYECTOS_PAQUETES_GREENBORN.md` y preguntar antes de actualizar consumidores. profesionales.top no aparece en ese listado; hay que incorporarlo.
- Verificar que los paquetes no estén en la lista de "no publicar".

## 7. Compatibilidad

- Antes de fijar peers, revisar las versiones de Vue, Express, Knex y `vue-greenborn-map-viewer` que usa profesionales.top, contra las de greenborn_1.
- Mantener el paquete de back agnóstico de la base de datos concreta: las migraciones usan Knex.

## 8. Orden de trabajo

1. Confirmar el punto abierto del domicilio (sección 1).
2. `express-greenborn-locales` y `vue-greenborn-locales-mapa` (dominio más acotado).
3. `express-greenborn-perfil` y `vue-greenborn-perfil`.
4. Migrar profesionales.top para que consuma los paquetes y elimine el código extraído. Esto requiere confirmación explícita antes de tocar el proyecto consumidor.
5. Tests de lista blanca y de aislamiento por titular en cada paquete back.

## 9. Preguntas abiertas

- ¿El domicilio de trabajo va a locales (propuesta) o queda en el perfil de usuario?
- ¿Los paquetes de back deben soportar varias entidades a la vez (por ejemplo, un usuario con negocios y otro con locales de distinto tipo) o una sola por instancia?
