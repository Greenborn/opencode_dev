import { getBearerToken } from './utils.js';

export const DEFAULT_RATE_LIMIT = Object.freeze({
  enabled: true,
  maxAttempts: 3,
  windowMs: 5 * 60 * 1000,
  blockMs: 5 * 60 * 1000,
  trustProxy: false,
  maxEntries: 10000,
});

const TOKEN_LIMIT_MARK = Symbol('ssoTokenRateLimit');
const CLEANUP_MAX_INTERVAL_MS = 60 * 1000;

function positiveInt(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(n);
}

function normalizeTrustProxy(value) {
  if (value === true) return 1;
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) return value;
  return false;
}

export function normalizeRateLimitConfig(input) {
  if (input === false) {
    return { ...DEFAULT_RATE_LIMIT, enabled: false, keyGenerator: null, onBlocked: null };
  }
  const raw = input && typeof input === 'object' ? input : {};
  const maxAttempts = positiveInt(raw.maxAttempts, DEFAULT_RATE_LIMIT.maxAttempts);
  const windowMs = positiveInt(raw.windowMs, DEFAULT_RATE_LIMIT.windowMs);
  const blockMs = positiveInt(raw.blockMs, windowMs);
  const maxEntries = positiveInt(raw.maxEntries, DEFAULT_RATE_LIMIT.maxEntries);

  return {
    enabled: raw.enabled !== false,
    maxAttempts,
    windowMs,
    blockMs,
    trustProxy: normalizeTrustProxy(raw.trustProxy),
    maxEntries,
    keyGenerator: typeof raw.keyGenerator === 'function' ? raw.keyGenerator : null,
    onBlocked: typeof raw.onBlocked === 'function' ? raw.onBlocked : null,
  };
}

function normalizeIp(raw) {
  let ip = typeof raw === 'string' ? raw.trim() : '';
  if (!ip) return null;
  if (ip.startsWith('[')) {
    const end = ip.indexOf(']');
    if (end > 0) ip = ip.slice(1, end);
  }
  if (ip.startsWith('::ffff:')) ip = ip.slice(7);
  return ip || null;
}

function forwardedIp(headers, hops) {
  if (!headers) return null;
  const raw = headers['x-forwarded-for'];
  if (!raw) return null;
  const list = (Array.isArray(raw) ? raw.join(',') : String(raw))
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  if (!list.length) return null;
  const index = list.length - (hops || 1);
  return normalizeIp(index >= 0 ? list[index] : list[0]);
}

export function getClientIp(req, trustProxy = false) {
  if (!req) return null;
  if (trustProxy) {
    const forwarded = forwardedIp(req.headers, trustProxy);
    if (forwarded) return forwarded;
  }
  return normalizeIp(req.ip || req.socket?.remoteAddress || req.connection?.remoteAddress);
}

export function getSocketIp(handshake, trustProxy = false) {
  if (!handshake) return null;
  if (trustProxy) {
    const forwarded = forwardedIp(handshake.headers, trustProxy);
    if (forwarded) return forwarded;
  }
  return normalizeIp(handshake.address || handshake.headers?.['x-real-ip']);
}

function createStore({ maxAttempts, windowMs, blockMs, maxEntries }) {
  const entries = new Map();
  const timer = setInterval(() => cleanup(), Math.min(windowMs, CLEANUP_MAX_INTERVAL_MS));
  if (typeof timer.unref === 'function') timer.unref();

  function prune(entry, now) {
    entry.failures = entry.failures.filter((ts) => now - ts < windowMs);
  }

  function drop(key) {
    entries.delete(key);
  }

  function evictOldest() {
    const oldest = entries.keys().next();
    if (!oldest.done) entries.delete(oldest.value);
  }

  function check(key) {
    const now = Date.now();
    const entry = entries.get(key);
    if (!entry) return { blocked: false, retryAfterMs: 0 };

    if (entry.blockedUntil > now) {
      return { blocked: true, retryAfterMs: entry.blockedUntil - now };
    }

    if (entry.blockedUntil) {
      entry.blockedUntil = 0;
      entry.failures = [];
    }

    prune(entry, now);
    if (!entry.failures.length) {
      drop(key);
      return { blocked: false, retryAfterMs: 0 };
    }
    return { blocked: false, retryAfterMs: 0 };
  }

  function recordFailure(key) {
    const now = Date.now();
    let entry = entries.get(key);
    if (!entry) {
      if (entries.size >= maxEntries) evictOldest();
      entry = { failures: [], blockedUntil: 0 };
      entries.set(key, entry);
    }

    if (entry.blockedUntil > now) {
      return { blocked: true, retryAfterMs: entry.blockedUntil - now };
    }
    if (entry.blockedUntil) {
      entry.blockedUntil = 0;
      entry.failures = [];
    }

    entry.failures.push(now);
    prune(entry, now);

    if (entry.failures.length >= maxAttempts) {
      entry.failures = [];
      entry.blockedUntil = now + blockMs;
      return { blocked: true, retryAfterMs: blockMs };
    }

    return { blocked: false, retryAfterMs: 0 };
  }

  function cleanup() {
    const now = Date.now();
    for (const [key, entry] of entries) {
      if (entry.blockedUntil > now) continue;
      if (entry.blockedUntil) {
        drop(key);
        continue;
      }
      prune(entry, now);
      if (!entry.failures.length) drop(key);
    }
  }

  function clear() {
    entries.clear();
  }

  return { check, recordFailure, reset: drop, clear, cleanup, size: () => entries.size };
}

function blockedBody(kind, retryAfterMs) {
  return {
    success: false,
    error: 'RATE_LIMITED',
    message: kind === 'login'
      ? 'Demasiados intentos de login fallidos. Intente nuevamente más tarde.'
      : 'Demasiados intentos de autenticación fallidos. Intente nuevamente más tarde.',
    retry_after_ms: retryAfterMs,
  };
}

function sendBlocked(res, kind, retryAfterMs) {
  const retryAfterSec = Math.max(1, Math.ceil(retryAfterMs / 1000));
  res.setHeader('Retry-After', String(retryAfterSec));
  return res.status(429).json(blockedBody(kind, retryAfterMs));
}

export function createRateLimiter(input = true) {
  const config = normalizeRateLimitConfig(input);
  const store = createStore(config);

  function keyFor(kind, req) {
    const ip = config.keyGenerator
      ? config.keyGenerator(req)
      : getClientIp(req, config.trustProxy);
    return `${kind}:${ip || 'unknown'}`;
  }

  function keyForSocket(handshake) {
    const ip = config.keyGenerator
      ? config.keyGenerator(handshake)
      : getSocketIp(handshake, config.trustProxy);
    return `token:${ip || 'unknown'}`;
  }

  function notifyBlocked(kind, info) {
    if (!config.onBlocked) return;
    try {
      config.onBlocked({ ...info, kind, config });
    } catch {
      // Un callback de logging no debe romper la respuesta.
    }
  }

  function middlewareFor(kind) {
    return function rateLimitMiddleware(req, res, next) {
      if (!config.enabled || typeof next !== 'function') return next ? next() : undefined;

      if (kind === 'token' && req[TOKEN_LIMIT_MARK]) return next();
      if (kind === 'token') req[TOKEN_LIMIT_MARK] = true;

      const key = keyFor(kind, req);
      const status = store.check(key);
      if (status.blocked) {
        notifyBlocked(kind, { key, retryAfterMs: status.retryAfterMs });
        return sendBlocked(res, kind, status.retryAfterMs);
      }

      const credentialsPresent = kind === 'login' || Boolean(getBearerToken(req));

      res.on('finish', () => {
        if (!credentialsPresent) return;
        if (res.statusCode === 401) {
          const result = store.recordFailure(key);
          if (result.blocked) {
            notifyBlocked(kind, { key, retryAfterMs: result.retryAfterMs });
          }
        } else if (res.statusCode >= 200 && res.statusCode < 300) {
          store.reset(key);
        }
      });

      return next();
    };
  }

  function checkSocket(handshake) {
    if (!config.enabled) return { blocked: false, retryAfterMs: 0 };
    return store.check(keyForSocket(handshake));
  }

  function recordSocketFailure(handshake) {
    if (!config.enabled) return { blocked: false, retryAfterMs: 0 };
    const key = keyForSocket(handshake);
    const result = store.recordFailure(key);
    if (result.blocked) {
      notifyBlocked('token', { key, retryAfterMs: result.retryAfterMs });
    }
    return result;
  }

  function resetSocket(handshake) {
    if (!config.enabled) return;
    store.reset(keyForSocket(handshake));
  }

  const loginMiddleware = middlewareFor('login');
  const tokenMiddleware = middlewareFor('token');

  return {
    config,
    loginMiddleware,
    tokenMiddleware,
    check: (kind, req) => (config.enabled ? store.check(keyFor(kind, req)) : { blocked: false, retryAfterMs: 0 }),
    recordFailure: (kind, req) => (config.enabled ? store.recordFailure(keyFor(kind, req)) : { blocked: false, retryAfterMs: 0 }),
    reset: (kind, req) => {
      if (config.enabled) store.reset(keyFor(kind, req));
    },
    checkSocket,
    recordSocketFailure,
    resetSocket,
    clear: () => store.clear(),
    cleanup: () => store.cleanup(),
    get size() {
      return store.size();
    },
  };
}
