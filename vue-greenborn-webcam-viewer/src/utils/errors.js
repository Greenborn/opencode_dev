// Traducción centralizada de los errores de navigator.mediaDevices.getUserMedia
// (DOMException en inglés) a mensajes legibles en español.
const MENSAJES_CAMARA = {
  NotAllowedError: 'permiso de cámara denegado',
  PermissionDeniedError: 'permiso de cámara denegado',
  NotFoundError: 'no se encontró ninguna cámara',
  DevicesNotFoundError: 'no se encontró ninguna cámara',
  NotReadableError: 'la cámara está en uso por otra aplicación o no responde',
  TrackStartError: 'la cámara está en uso por otra aplicación o no responde',
  OverconstrainedError: 'la cámara no soporta la resolución solicitada',
  ConstraintNotSatisfiedError: 'la cámara no soporta la resolución solicitada',
  SecurityError: 'acceso a la cámara bloqueado (se requiere HTTPS o localhost)',
  AbortError: 'se interrumpió el acceso a la cámara',
}

export function traducirErrorCamara(err) {
  const nombre = err && err.name
  return (
    MENSAJES_CAMARA[nombre] ||
    `no se pudo acceder a la cámara (${nombre || (err && err.message) || 'error desconocido'})`
  )
}

export { MENSAJES_CAMARA }
