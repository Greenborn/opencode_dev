# AGENTS.md

- Todas las demos deben usar el puerto 5175.

## Paquetes internos y proyectos consumidores

- Este monorepo es la fuente de los paquetes internos npm (express-greenborn-sso-back, vue-greenborn-sso-front, angular-greenborn-sso-front, vue-greenborn-modal-manager, vue-table-editor, @greenborn/vue-side-menu, vue-greenborn-panels, vue-greenborn-remote-terminal, greenborn-memory-cache, angular-greenborn-image-detail, express-greenborn-mercado-pago).
- El listado de proyectos/subproyectos que usan uno o más de estos paquetes (con rutas y versiones) está en `PROYECTOS_PAQUETES_GREENBORN.md` (raíz del repo, ignorado por git).
- **Regla obligatoria**: ante cualquier modificación de código o bump de versión de un paquete de este monorepo, consultar `PROYECTOS_PAQUETES_GREENBORN.md` y **preguntar siempre al usuario** si desea actualizar los proyectos/subproyectos que implementan ese paquete antes de continuar.