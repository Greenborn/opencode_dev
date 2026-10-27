import helmet from 'helmet';

export function createSecurityMiddleware(options = {}) {
  const {
    enableHsts = true,
    enableCsp = true,
    enableFrameguard = true,
    enableXssFilter = true,
    enableDnsPrefetch = true,
    enableContentType = true,
    enableReferrer = true,
    hstsMaxAge = 31536000, // 1 año
    hstsIncludeSubDomains = true,
    hstsPreload = true,
  } = options;

  const helmetConfig = {};

  if (enableHsts) {
    helmetConfig.strictTransportSecurity = {
      maxAge: hstsMaxAge,
      includeSubDomains: hstsIncludeSubDomains,
      preload: hstsPreload,
    };
  }

  if (enableCsp) {
    helmetConfig.contentSecurityPolicy = {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        fontSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        mediaSrc: ["'self'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    };
  }

  if (enableFrameguard) {
    helmetConfig.frameguard = {
      action: 'deny',
    };
  }

  if (enableXssFilter) {
    helmetConfig.xssFilter = true;
  }

  if (enableDnsPrefetch) {
    helmetConfig.dnsPrefetchControl = {
      allow: false,
    };
  }

  if (enableContentType) {
    helmetConfig.noSniff = true;
  }

  if (enableReferrer) {
    helmetConfig.referrerPolicy = {
      policy: 'no-referrer',
    };
  }

  return helmet(helmetConfig);
}

export default createSecurityMiddleware;
