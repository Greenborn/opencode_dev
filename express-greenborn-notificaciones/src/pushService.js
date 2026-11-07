import webpush from 'web-push';

/**
 * Crea el servicio de envío de Web Push (VAPID) + CRUD de suscripciones.
 * Agnóstico de framework/esquema: recibe knex, nombre de tabla y columna de
 * usuario por inyección de dependencias.
 */
export function createPushService(ctx) {
  const {
    knex,
    table = 'push_subscriptions',
    userColumn = 'usuario_id',
    vapid = {},
    logger,
  } = ctx;

  const log = logger && typeof logger.error === 'function'
    ? logger
    : { error: (...a) => console.error(...a), warn: (...a) => console.warn(...a) };

  const vapidConfigurado = Boolean(vapid.publicKey && vapid.privateKey);

  if (vapidConfigurado) {
    webpush.setVapidDetails(
      vapid.subject || 'mailto:soporte@greenborn.com.ar',
      vapid.publicKey,
      vapid.privateKey
    );
  } else {
    log.warn?.('[notificaciones] VAPID no configurado: el envío de push quedará deshabilitado.');
  }

  function vapidPublicKey() {
    return vapid.publicKey || null;
  }

  function estaConfigurado() {
    return vapidConfigurado;
  }

  async function enviarA(subscription, payload) {
    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth },
        },
        JSON.stringify(payload)
      );
      return { ok: true };
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 410) {
        await knex(table).where({ id: subscription.id }).del();
      }
      return { ok: false, error: err.message };
    }
  }

  async function enviarPushAUsuario(usuarioId, payload) {
    if (!vapidConfigurado) return { enviados: 0, fallidos: 0 };
    const subs = await knex(table).where({ [userColumn]: usuarioId });
    const resultados = await Promise.all(subs.map((s) => enviarA(s, payload)));
    return {
      enviados: resultados.filter((r) => r.ok).length,
      fallidos: resultados.filter((r) => !r.ok).length,
    };
  }

  async function enviarPushATodos(payload) {
    if (!vapidConfigurado) return { enviados: 0, fallidos: 0 };
    const subs = await knex(table).select();
    const resultados = await Promise.all(subs.map((s) => enviarA(s, payload)));
    return {
      enviados: resultados.filter((r) => r.ok).length,
      fallidos: resultados.filter((r) => !r.ok).length,
    };
  }

  async function suscribir({ usuarioId, endpoint, p256dh, auth, userAgent }) {
    const existente = await knex(table).where({ endpoint }).first();
    if (existente) {
      await knex(table).where({ id: existente.id }).update({
        [userColumn]: usuarioId,
        p256dh,
        auth,
        user_agent: userAgent || null,
      });
    } else {
      await knex(table).insert({
        [userColumn]: usuarioId,
        endpoint,
        p256dh,
        auth,
        user_agent: userAgent || null,
      });
    }
  }

  async function desuscribir({ usuarioId, endpoint }) {
    await knex(table).where({ endpoint, [userColumn]: usuarioId }).del();
  }

  return {
    vapidPublicKey,
    estaConfigurado,
    enviarPushAUsuario,
    enviarPushATodos,
    suscribir,
    desuscribir,
  };
}
