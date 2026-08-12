export interface SSOCallbackParams {
  token: string;
  unique_id: string;
}

export interface SSOUser {
  id: number;
  nombre?: string;
  email: string;
  role_id?: number;
  username?: string;
  [key: string]: any;
}

export interface SSOLoginResponse {
  bearer_token: string;
  user: SSOUser;
}

export interface SSOVerifyResponse {
  success: boolean;
  data: {
    user: SSOUser;
    extended?: boolean;
  };
}

export interface SSOProfileResponse {
  success: boolean;
  exists: boolean;
  user: {
    id: number;
    username: string;
    email: string;
    role_id: number;
    profile_id: number;
    status: number;
    [key: string]: any;
  } | null;
}

export interface SSOCallbackResult {
  exists: boolean;
  localUser?: {
    id: number;
    username: string;
    email: string;
    role_id: number;
  };
  ssoEmail: string;
  bearer_token: string;
}

export interface SSOVerifyResult {
  authenticated: boolean;
  user?: SSOUser | null;
  extended?: boolean;
  requireReauth?: boolean;
}

export interface SSOSessionState {
  token: string | null;
  user: SSOUser | null;
  authenticated: boolean;
}
