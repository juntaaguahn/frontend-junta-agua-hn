const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const projectRoot = path.resolve(__dirname, '..');
const targetPath = path.join(projectRoot, 'src/environments/environment.ts');

// ---------------------------------------------------------------------------
// Resolución del apiUrl:
//   1. API_URL directa (override para CI/deploys)
//   2. <API_PROVIDER>_API_URL  (cambia el proveedor solo con API_PROVIDER)
//   3. Último recurso: localhost
// ---------------------------------------------------------------------------
const direct = (process.env.API_URL || '').trim();
const provider = (process.env.API_PROVIDER || '').trim().toUpperCase();
const fromProvider = provider ? (process.env[`${provider}_API_URL`] || '').trim() : '';
const apiUrl = direct || fromProvider || 'http://localhost:4000/api';

const production = process.env.PRODUCTION === 'true';
const currencySymbol = process.env.CURRENCY_SYMBOL || 'L ';

const envConfigFile = `// GENERADO por src/set-env.js — NO editar a mano.
// Cambia los valores en src/.env y ejecuta: npm run config
export const environment = {
  production: ${NODE_ENV},
  apiUrl: '${API_URL}',
  currencySymbol: '${CURRENCY_SYMBOL}',
};

fs.writeFileSync(targetPath, envConfigFile);
console.log(`environment generado → ${targetPath}`);
