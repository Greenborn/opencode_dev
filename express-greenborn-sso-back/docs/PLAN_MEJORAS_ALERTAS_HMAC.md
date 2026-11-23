# Plan de mejoras: alertas de login inválido

Estado actual (v1.12.0): el paquete envía `POST /api/public/alertas-login` con los headers `x-project-slug` y `x-api-key` (API_KEY en claro, por cada login inválido, fire-and-forget).

## Limitaciones de la versión actual

- La API_KEY viaja en cada request: si el canal no es HTTPS o un proxy registra headers, la clave queda expuesta.
- No hay protección anti-replay: un atacante que capture una request puede reenviar reportes falsos.
- Cada intento genera un reporte; sin agrupación, un ataque de fuerza bruta satura el panel de SGI.
- Si SGI está caído, los reportes se pierden (solo queda el log local).

## Mejoras propuestas

1. **Firma HMAC-SHA256 del body** (reemplaza `x-api-key` en claro)
   - Headers: `x-project-slug`, `x-timestamp` (ms), `x-nonce` (UUID v4), `x-signature` = HMAC-SHA256(secreto, `timestamp.nonce.body`).
   - SGI verifica la firma con comparación de tiempo constante y rechaza timestamps fuera de una ventana (p. ej. ±5 min).
   - Cambio de contrato: el paquete pasa a una versión mayor o a un modo `signing: 'hmac'` con compatibilidad hacia atrás.

2. **Anti-replay**: SGI guarda los nonces usados dentro de la ventana de timestamp y rechaza repeticiones.

3. **Rotación de API_KEY/secreto**: soportar dos claves activas simultáneamente durante la rotación (`kid` en header).

4. **Agrupación y umbrales**: en el paquete, opción `threshold: { attempts, windowMs }` para enviar un reporte agregado por usuario/IP en lugar de uno por intento. En SGI, agregación por ventana en la vista de reportes.

5. **Cola con reintentos**: buffer en memoria con backoff exponencial y límite de tamaño; persistencia opcional en la base del proyecto para sobrevivir reinicios.

6. **Alerta por bloqueo (429)**: reportar también los bloqueos del rate limiter con motivo `RATE_LIMITED`.

7. **Notificación a administradores**: al recibir reportes de un proyecto, notificar a los usuarios ADMIN de SGI (reutilizando el sistema de notificaciones existente).

## Orden sugerido

1. Umbrales y alerta por 429 (sin cambio de contrato).
2. Firma HMAC + anti-replay + rotación (cambio de contrato, versión mayor).
3. Cola con reintentos.
