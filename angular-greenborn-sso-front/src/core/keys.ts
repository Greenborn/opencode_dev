export const SSO_TOKEN_KEY = 'sso_bearer_token';
export const SSO_USER_KEY = 'sso_user_data';
export const SSO_REDIRECT_URL_KEY = 'sso_redirect_url';
export const SSO_CLIENT_UNIQUE_ID = 'sso_client_unique_id';

export function generateUniqueId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeSet(key: string, value: string | null): void {
  try {
    if (value == null) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, value);
    }
  } catch {
    // localStorage no disponible
  }
}

export function safeRemove(key: string): void {
  safeSet(key, null);
}
