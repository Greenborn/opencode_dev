import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { DB_FILE } from './src/config.js';

const here = dirname(fileURLToPath(import.meta.url));

export default {
  client: 'better-sqlite3',
  connection: { filename: DB_FILE },
  useNullAsDefault: true,
  migrations: { directory: join(here, 'migrations') },
  seeds: { directory: join(here, 'seeds') },
};
