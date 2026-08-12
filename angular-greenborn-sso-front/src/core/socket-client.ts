import { io, Socket } from 'socket.io-client';

export interface SocketClientOptions {
  url?: string;
  path?: string;
  token?: string;
  uniqueId?: string;
  socketOptions?: Record<string, any>;
}

export interface SocketError {
  success: boolean;
  error?: string;
}

export interface SocketEvent {
  type: 'connect' | 'disconnect' | 'error';
  error?: any;
}

export type EventHandler = (payload: any) => void;

export interface SocketClient {
  connect(): void;
  disconnect(): void;
  emit(name: string, payload?: any, callback?: (res: any) => void): Promise<any> | void;
  on(name: string, handler: EventHandler): void;
  off(name: string, handler: EventHandler): void;
  once(name: string, handler: EventHandler): void;
  setToken(newToken: string, newUniqueId: string): void;
  subscribe(cb: (e: SocketEvent) => void): () => void;
  onError(cb: (e: any) => void): () => void;
  readonly isConnected: boolean;
  readonly raw: Socket | null;
}

export function createSocketClient(options: SocketClientOptions = {}): SocketClient {
  const { url = '', path = '/socket.io', token = '', uniqueId = '', socketOptions = {} } = options;
  let socket: Socket | null = null;
  const listeners = new Set<(e: SocketEvent) => void>();
  const errorListeners = new Set<(e: any) => void>();
  let auth = { token, unique_id: uniqueId };

  function notify(type: SocketEvent['type'], error?: any): void {
    listeners.forEach((cb) => cb({ type, error }));
  }

  function notifyError(e: any): void {
    errorListeners.forEach((cb) => cb(e));
    notify('error', e);
  }

  function connect(): void {
    if (socket) return;
    socket = io(url, {
      path,
      auth,
      reconnection: true,
      ...socketOptions,
    });
    socket.on('connect', () => notify('connect'));
    socket.on('disconnect', () => notify('disconnect'));
    socket.on('connect_error', (err) => notifyError(err));
    socket.connect();
  }

  function disconnect(): void {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  }

  function emit(name: string, payload?: any, callback?: (res: any) => void): Promise<any> | void {
    if (!socket || !socket.connected) {
      const err: SocketError = { success: false, error: 'Socket no conectado' };
      if (callback) {
        callback(err);
        return;
      }
      return Promise.reject(err);
    }
    if (callback) {
      socket.emit(name, payload, callback);
      return;
    }
    return new Promise((resolve, reject) => {
      socket.emit(name, payload, (res: any) => {
        if (res && res.success === false && res.error) {
          reject(res);
        } else {
          resolve(res);
        }
      });
    });
  }

  function on(name: string, handler: EventHandler): void {
    if (!socket) connect();
    socket.on(name, handler);
  }

  function off(name: string, handler: EventHandler): void {
    if (socket) socket.off(name, handler);
  }

  function once(name: string, handler: EventHandler): void {
    if (!socket) connect();
    socket.once(name, handler);
  }

  function setToken(newToken: string, newUniqueId: string): void {
    auth = { token: newToken, unique_id: newUniqueId };
    if (socket) {
      socket.auth = auth;
    }
  }

  function subscribe(cb: (e: SocketEvent) => void): () => void {
    listeners.add(cb);
    return () => listeners.delete(cb);
  }

  function onError(cb: (e: any) => void): () => void {
    errorListeners.add(cb);
    return () => errorListeners.delete(cb);
  }

  return {
    connect,
    disconnect,
    emit,
    on,
    off,
    once,
    setToken,
    subscribe,
    onError,
    get isConnected(): boolean {
      return !!socket && socket.connected;
    },
    get raw(): Socket | null {
      return socket;
    },
  };
}
