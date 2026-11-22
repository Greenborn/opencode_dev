import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));

// Base de datos de la demo: archivo dentro de crud-demo/backend/data
export const DB_FILE = join(here, '..', 'data', 'crud_demo.sqlite3');
export const PORT = 4300;
