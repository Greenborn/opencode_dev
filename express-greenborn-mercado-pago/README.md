# express-greenborn-mercado-pago

Integración **centralizada con Mercado Pago** para backends **Express/Node.js**: un **API client** (axios) sobre `api.mercadopago.com` y un **webhook receptor** con deduplicación, con **inyección de dependencias** (knex, logger) y **agnóstico del esquema de base de datos**.

El paquete extrae y generaliza el código de pago del backend de referencia (`mercado_pago_iot`) y lo expone de forma reutilizable. Igual que [`express-greenborn-sso-back`](https://github.com/Greenborn/opencode_dev/tree/main/express-greenborn-sso-back), se inyecta vía factory (`createMercadoPago`) para no depender de `global.knex` ni del esquema del host.

> **Alcance actual:** API client + webhook receptor + migraciones. El objetivo del paquete es, a futuro, **centralizar todo lo referente a Mercado Pago** (procesador de eventos, preferencias de pago a demanda, sucursales/stores, POS/QR, renovación de QR) como módulos del mismo factory.

---

## Instalación

```bash
npm install express-greenborn-mercado-pago
```

Requisitos: Node.js ≥ 18, Express `^4`, y una instancia de **Knex** configurada.

## Uso rápido

```js
import { createMercadoPago } from 'express-greenborn-mercado-pago';
import express from 'express';
import knex from 'knex';

const db = knex({ /* conexión a tu base de datos */ });

const mp = createMercadoPago({
  knex: db,                                         // obligatorio (inyectado)
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN, // o se lee de env
  userId: process.env.MERCADOPAGO_USER_ID,
  logger: console,
  onNewWebhook: async (payload, info) => {
    // El host decide qué hacer con un webhook nuevo (p. ej. disparar su
    // procesador de eventos asíncrono).
    console.log('evento MP nuevo', info);
  },
});

const app = express();
app.use(express.json());

// Webhook público de Mercado Pago → POST /api/webhook/mercadopago
app.use(mp.rootPath, mp.webhookRouter);

// Usar el client
app.get('/api/pagos/:id', async (req, res) => {
  const payment = await mp.client.getPayment(req.params.id);
  res.json(payment);
});

app.listen(5175);
```

## Opciones de `createMercadoPago`

| Opción | Tipo | Default | Descripción |
|--------|------|---------|-------------|
| `knex` | object | **obligatorio** | Instancia de Knex. Reemplaza `global.knex`. |
| `accessToken` | string | `env MERCADOPAGO_ACCESS_TOKEN` | Token de acceso de la cuenta de Mercado Pago (APP_USR / TEST). |
| `userId` | number | `env MERCADOPAGO_USER_ID` | ID de la cuenta (collector). |
| `logger` | object | silencioso | `{ info, warn, error, debug, log }`. Acepta `console`. |
| `baseUrl` | string | `https://api.mercadopago.com` | Base de la API REST. |
| `apiTimeoutMs` | number | `4000` | Timeout de cada llamada HTTP. |
| `httpsAgent` | object | null | Agent HTTPS opcional (reutilización de conexiones `keep-alive`). |
| `onNewWebhook` | function | null | `(payload, { payment_id, payment_status }) => void`. Se dispara al registrar un **evento nuevo** en `evento_mercado_pago`. |

Además acepta opciones de configuración adicionales (ver [Variables de entorno](#variables-de-entorno)) que se resuelven a `mp.config`.

### Valor de retorno

```js
{
  client,          // instancia de MercadoPagoClient
  webhookRouter,   // express.Router (mountable)
  webhookHandler,  // handler Express directo (para montar a mano)
  config,          // configuración resuelta (credenciales, store, pos, preferencia, qr)
  rootPath,        // '/api/webhook' (ruta sugerida para montar el router)
}
```

## `MercadoPagoClient`

Cliente axios sobre la API REST de Mercado Pago (sin la SDK oficial; igual que el proyecto de origen). Centraliza **todos** los endpoints que usa el ecosistema, para que el paquete pueda absorber el resto del flujo sin duplicar llamadas HTTP.

| Método | Endpoint MP |
|--------|-------------|
| `getPayment(id)` | `GET /v1/payments/{id}` |
| `getMerchantOrder(id)` | `GET /merchant_orders/{id}` |
| `getOrder(id)` | `GET /v1/orders/{id}` |
| `createStore(userId, data)` | `POST /users/{uid}/stores` |
| `updateStore(userId, storeId, data)` | `PUT /users/{uid}/stores/{sid}` |
| `deleteStore(userId, storeId)` | `DELETE /users/{uid}/stores/{sid}` |
| `createPos(data, idempotencyKey)` | `POST /pos` (con `X-Idempotency-Key`) |
| `getPosByExternalId(externalId)` | `GET /pos?external_id=...` |
| `deletePos(posId)` | `DELETE /pos/{posId}` |
| `createQrOrder({ userId, externalStoreId, externalPosId, orderPayload })` | `PUT .../stores/{ext}/pos/{extPos}/orders` |

Todos envían `Authorization: Bearer <accessToken>` y devuelven la `response.data` (JSON) de Mercado Pago.

## Variables de entorno

Lee de `process.env` cuando las opciones no se inyectan:

| Variable | Uso |
|----------|-----|
| `MERCADOPAGO_ACCESS_TOKEN` | Token de la cuenta MP (obligatorio). |
| `MERCADOPAGO_USER_ID` | ID de la cuenta MP (collector). |
| `MERCADOPAGO_API_BASE` / `MERCADOPAGO_API_TIMEOUT_MS` | Base y timeout de la API. |
| `MERCADOPAGO_CREATE_STORE_ON_LOCAL` | Crear sucursal automáticamente al crear un local. |
| `MERCADOPAGO_STORE_EXTERNAL_PREFIX` | Prefijo `external_id` de sucursales (default `SUC_`). |
| `MERCADOPAGO_POS_CATEGORY` / `MERCADOPAGO_POS_DEFAULT_NAME` / `MERCADOPAGO_POS_EXTERNAL_PREFIX` | Config de POS. |
| `PREFERENCIA_EXPIRACION_MINUTOS` | Minutos de expiración de preferencias a demanda (default 15). |
| `QR_RENOVATION_ON_PAYMENT_APPROVED` | Renovar QR tras pago aprobado (default true). |

## Migraciones

Las tablas de Mercado Pago viven en `migrations/` y se ejecutan contra la BD del host. Copiá las que necesites a tu `migrations` o apuntá knex a esta carpeta:

```bash
knex --knexfile ./knexfile.js migrate:latest
```

Incluye:
- `20260201000001_create_evento_mercado_pago.js` — notificaciones/webhooks, con índice único `(payment_id, payment_status)` para deduplicar reenvíos de MP.
- `20260201000002_create_evento_mercado_pago_status.js` — catálogo de estados de pago.
- `20260201000003_create_preferencia_pago_generada.js` — QRs de pago a demanda.
- `20260201000004_add_mp_columns.js` — columnas `mp_*` / `qr_*` sobre `caja` y `local_comercio` (idempotente; agrega solo si la columna no existe).

## Demo (puerto 5175)

```bash
npm run demo
```

Levanta un servidor en `http://localhost:5175` (puerto estándar de demos Greenborn) que monta el webhook y expone ejemplos de uso del `client`:

- `POST /api/webhook/mercadopago` — webhook público.
- `GET /api/pagos/:id` — consulta un pago con el client.
- `POST /api/preferencias-pago/crear` — ejemplo de preferencia a demanda (QR) con `client.createQrOrder`.

## Scripts

```bash
npm run build      # esbuild → dist/ (ESM + CJS + index.d.ts)
npm test           # node --test
npm run demo       # demo server (puerto 5175)
npm publish        # (corre prepublishOnly → build)
```

## Licencia

MIT