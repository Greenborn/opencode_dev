import axios from 'axios';

export function createSsoClient({ ssoBaseUrl, timeoutMs, logger }) {
  const log = logger && typeof logger.error === 'function'
    ? logger
    : { error: (...a) => console.error(...a) };

  const base = String(ssoBaseUrl || 'https://auth.greenborn.com.ar').replace(/\/+$/, '');

  async function verifyToken(token, uniqueId) {
    const response = await axios.get(
      `${base}/auth/verify?unique_id=${encodeURIComponent(uniqueId)}`,
      { headers: { Authorization: `Bearer ${token}` }, timeout: timeoutMs },
    );
    return response;
  }

  async function extendSession(token, uniqueId) {
    const response = await axios.post(
      `${base}/auth/extend`,
      { unique_id: uniqueId },
      { headers: { Authorization: `Bearer ${token}` }, timeout: timeoutMs },
    );
    return response;
  }

  function isTokenValid(response) {
    return Boolean(response?.data?.success && response?.data?.data?.valid);
  }

  return { base, verifyToken, extendSession, isTokenValid, log };
}
