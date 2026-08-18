import 'dotenv/config';
import express from 'express';
import knex from 'knex';
import { createMercadoPago } from '../src/index.js';

const app = express();
const port = process.env.SERVICE_PORT || 5175; // AGENTS.md: todas las demos usan 5175

// Conexión a la base de datos local (se inyecta a createMercadoPago).
// El paquete NO crea su propia conexión; usa la del host.
const db = knex({
  client: (process.env.DB_CLIENT || 'mysql2').toLowerCase(),
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  },
});

const mp = createMercadoPago({
  knex: db,
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN, // o se lee de env automáticamente
  userId: process.env.MERCADOPAGO_USER_ID,
  logger: console,
  // El host decide qué hacer con un webhook nuevo (en mercado_pago_iot esto
  // disparaba el procesador asíncrono de eventos).
  onNewWebhook: async (payload, info) => {
    console.log('[onNewWebhook] evento nuevo registrado', info, 'payload.id =', payload?.id);
  },
});

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    package: 'express-greenborn-mercado-pago',
    hasClient: !!mp.client,
    hasWebhook: !!mp.webhookRouter,
  });
});

// Webhook público de Mercado Pago → POST <host>/api/webhook/mercadopago
app.use(mp.rootPath, mp.webhookRouter);

// Ejemplo de uso del API client: consultar un pago
app.get('/api/pagos/:id', async (req, res) => {
  try {
    const payment = await mp.client.getPayment(req.params.id);
    res.json(payment);
  } catch (error) {
    res.status(error?.response?.status || 500).json({
      error: error?.response?.data || error.message,
    });
  }
});

// Ejemplo de preferencia de pago a demanda (QR variable) usando el client
app.post('/api/preferencias-pago/crear', async (req, res) => {
  const { userId, externalStoreId, externalPosId, externalReference, monto, titulo } = req.body;
  if (!userId || !externalStoreId || !externalPosId || !monto) {
    return res.status(400).json({ error: 'userId, externalStoreId, externalPosId y monto son requeridos' });
  }
  const expiration = new Date();
  expiration.setMinutes(expiration.getMinutes() + mp.config.preferencia.expiracionMinutos);
  const ref = externalReference || `PREF_demo_${Date.now()}`;
  try {
    const result = await mp.client.createQrOrder({
      userId,
      externalStoreId,
      externalPosId,
      orderPayload: {
        external_reference: ref,
        title: titulo || 'Pago demo',
        description: `Pago de $${monto}`,
        total_amount: monto,
        expiration_date: expiration.toISOString(),
        items: [{ title: titulo || 'Pago', unit_price: monto, quantity: 1, unit_measure: 'unit', total_amount: monto }],
      },
    });
    res.status(201).json({ external_reference: ref, qr_data: result.qr_data || null, resp: result });
  } catch (error) {
    res.status(error?.response?.status || 502).json({ error: error?.response?.data || error.message });
  }
});

app.listen(port, () => {
  console.log(`Demo express-greenborn-mercado-pago en http://localhost:${port}`);
  console.log(`  - POST ${mp.rootPath}/mercadopago   (webhook público de MP)`);
  console.log(`  - GET  /api/pagos/:id               (consulta pago con client)`);
  console.log(`  - POST /api/preferencias-pago/crear (preferencia a demanda / QR con client)`);
  console.log(`  - GET  /health`);
});