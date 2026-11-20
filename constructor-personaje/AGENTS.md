# AGENTS.md — @greenborn/constructor-personaje

- Documentación de uso: `README.md`.
- Pruebas: `npm test` (debe quedar en verde antes de publicar).
- Dependencias: `@greenborn/modelos-personajes` y `@greenborn/accesorios-personaje` (peers y devDependencies).
  No duplicar su catálogo ni su geometría: leerlos de ahí.
- `src/index.js` no debe importar three.js ni el DOM (sirve para Node y Worker).
- Cada cambio de código exige subir `version` en `package.json` y publicar en npm (scope `@greenborn`, `access: public`).
- Antes de publicar, consultar el monorepo `greenborn_1/PROYECTOS_PAQUETES_GREENBORN.md` y preguntar
  al usuario si se actualizan los proyectos que lo consumen.
- No poner tokens en el repositorio: publicar con una variable de entorno y un `.npmrc` fuera del repo.
