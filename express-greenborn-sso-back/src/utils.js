export function normalizeUniqueId(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 255);
}

export function parseSsoRoleMap(raw) {
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  }
  if (raw && typeof raw === 'object') return raw;
  return null;
}

export function resolveSsoRole(email, roleMap, defaultRoleId = 3) {
  if (!email) return defaultRoleId;
  const map = roleMap && typeof roleMap === 'object' ? roleMap : {};
  if (map[email] !== undefined) return map[email];
  for (const [pattern, roleId] of Object.entries(map)) {
    if (pattern.startsWith('*') && email.endsWith(pattern.slice(1))) {
      return roleId;
    }
  }
  return defaultRoleId;
}

export function filterSensitive(user, sensitiveFields) {
  if (!user || typeof user !== 'object') return user;
  const keys = Array.isArray(sensitiveFields) ? sensitiveFields : [];
  const out = {};
  for (const [key, value] of Object.entries(user)) {
    if (!keys.includes(key)) out[key] = value;
  }
  return out;
}

export function getBearerToken(req) {
  const header = req?.headers?.authorization;
  if (!header || typeof header !== 'string') return null;
  if (!header.startsWith('Bearer ')) return null;
  const token = header.replace('Bearer ', '').trim();
  return token || null;
}

export function tokenPreview(token) {
  if (typeof token !== 'string') return '';
  return token.length > 20 ? `${token.substring(0, 20)}...` : token;
}
