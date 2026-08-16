export const DEFAULT_ACTIVITY_TABLE = 'gb_sso_log_actividad';
export const DEFAULT_MAX_STRING_LEN = 4096;

export function isBase64String(value) {
  if (typeof value !== 'string') return false;
  if (value.length < 16) return false;
  if (value.length % 4 !== 0) return false;
  return /^[A-Za-z0-9+/]*={0,2}$/.test(value);
}

export function filterInputData(input, maxStringLen = DEFAULT_MAX_STRING_LEN) {
  if (typeof input === 'string') {
    if (input.length > maxStringLen) return '[excluido: texto muy largo]';
    if (isBase64String(input)) return '[excluido: base64]';
    return input;
  }
  if (Array.isArray(input)) {
    return input.map((item) => filterInputData(item, maxStringLen));
  }
  if (input && typeof input === 'object') {
    const out = {};
    for (const [key, value] of Object.entries(input)) {
      if (typeof value === 'string') {
        if (isBase64String(value)) continue;
        if (value.length > maxStringLen) continue;
      }
      out[key] = filterInputData(value, maxStringLen);
    }
    return out;
  }
  return input;
}

export function parseIp(raw) {
  let ip = (raw || '').trim();
  if (!ip) return { ipv4: null, ipv6: null };
  if (ip.startsWith('::ffff:')) {
    return { ipv4: ip.slice(7) || null, ipv6: null };
  }
  if (ip.includes(':')) {
    return { ipv4: null, ipv6: ip };
  }
  return { ipv4: ip, ipv6: null };
}

export async function ensureActivityTable(knex, table = DEFAULT_ACTIVITY_TABLE) {
  if (!knex || typeof knex.schema?.hasTable !== 'function') return false;
  const exists = await knex.schema.hasTable(table);
  if (exists) return true;
  await knex.schema.createTable(table, (t) => {
    t.increments('id').primary();
    t.timestamp('fecha_hora').notNullable().defaultTo(knex.fn.now());
    t.string('endpoint', 512).notNullable();
    t.bigInteger('id_usuario').nullable();
    t.string('metodo', 10).notNullable();
    t.string('ipv4', 45).nullable();
    t.string('ipv6', 45).nullable();
    t.json('datos_entrada').nullable();
    t.index(['fecha_hora']);
  });
  return true;
}

export function createActivityLogger(ctx) {
  const { knex, logger } = ctx;
  const table = ctx.activityLog?.table || DEFAULT_ACTIVITY_TABLE;
  const maxStringLen = ctx.activityLog?.maxStringLen || DEFAULT_MAX_STRING_LEN;
  const captureBody = ctx.activityLog?.captureBody !== false;
  const captureQuery = ctx.activityLog?.captureQuery !== false;

  const log = logger && typeof logger.error === 'function'
    ? logger
    : { error: (...a) => console.error(...a) };

  let ensurePromise = null;
  let ensured = false;

  async function logActivity(req, user) {
    if (!user) return;
    try {
      if (!ensured) {
        ensurePromise = ensurePromise || ensureActivityTable(knex, table);
        await ensurePromise;
        ensured = true;
      }
      const input = {};
      if (captureBody && req.body && typeof req.body === 'object') Object.assign(input, req.body);
      if (captureQuery && req.query && typeof req.query === 'object') Object.assign(input, req.query);
      const ip = parseIp(req.ip || req.socket?.remoteAddress);
      const userId = user?.id ?? user?.[ctx.tables?.userPkField] ?? null;
      await knex(table).insert({
        fecha_hora: new Date(),
        endpoint: req.originalUrl || req.url || '',
        id_usuario: userId != null ? userId : null,
        metodo: (req.method || '').toUpperCase(),
        ipv4: ip.ipv4,
        ipv6: ip.ipv6,
        datos_entrada: filterInputData(input, maxStringLen),
      });
    } catch (err) {
      log.error(`[ActivityLog] Error al registrar actividad: ${err.message}`);
    }
  }

  return { logActivity, ensureActivityTable: () => ensureActivityTable(knex, table) };
}
