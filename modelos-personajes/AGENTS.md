# AGENTS.md — @greenborn/modelos-personajes

Instrucciones para agentes de IA que trabajen en este paquete o lo usen.

- Documentación de uso: `README.md` (sección "Guía para agentes de IA" con recetas A–E y reglas).
- Pruebas: `npm test` (debe quedar en verde antes de publicar).
- Subrutas: raíz, `/geometria` (cálculo y voxel, apto para Worker), `/animacion` (poses puras,
  sin three), `/three` (dibujo, pool instanciado y matrices).
- Antes de cambiar una constante de animación, revisar `src/animacion/poses.js` (`ANIMACION`):
  el juego compara contra esos valores.
- Cada cambio de código exige subir `version` en `package.json` y `VERSION` en `src/index.js`,
  y publicar en npm (scope `@greenborn`, `access: public`). No dejar cambios sin publicar.
- Antes de publicar, consultar el monorepo `greenborn_1/PROYECTOS_PAQUETES_GREENBORN.md` y
  preguntar al usuario si se actualizan los proyectos que lo consumen.
- No poner tokens en el repositorio: publicar con una variable de entorno y un `.npmrc` fuera del repo.
