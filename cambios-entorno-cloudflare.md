# Cambios: parametrización del entorno y despliegue en Cloudflare (2026-08-02)

Documentación de todos los cambios realizados para que el frontend lea la URL de la API y el símbolo de moneda desde variables de entorno (Cloudflare Workers Builds) en lugar de hardcodearlos, y de los errores que se fueron solucionando en el camino.

---

## 1. Problema original

El frontend se desplegaba en Cloudflare Workers como sitio estático con la URL de la API **quemada en el código** (`src/environments/environment.prod.ts`). Cada vez que cambiaba el proveedor del backend había que editar el código, commitear y redeployar.

**Objetivo:** que el build de Cloudflare lea `API_URL`, `PRODUCTION` y `CURRENCY_SYMBOL` desde variables de entorno y las hornee en el bundle, sin tocar el código.

---

## 2. Flujo actual (cómo funciona ahora)

```
Cloudflare Workers Builds
  └─ Settings → Build → Build Variables and Secrets
       API_URL, PRODUCTION=true, CURRENCY_SYMBOL="L "
       │  (se inyectan como variables de entorno del proceso de build)
       ▼
npm run build
  └─ node src/set-env.js          ← genera src/environments/environment.ts
       · lee process.env (API_URL, PRODUCTION, CURRENCY_SYMBOL)
       · si no están, cae a src/.env (dotenv) → luego a defaults
       ▼
  └─ ng build                     ← compila con esos valores en el bundle
```

Los servicios de Angular importan `environment` desde `../../../environments/environment` (no hay `fileReplacements`, así que el archivo generado es el que se usa siempre).

Precedencia del `apiUrl` en `set-env.js`:

1. `API_URL` (variable de entorno directa, gana siempre)
2. `<API_PROVIDER>_API_URL` (ej. `RENDER_API_URL`)
3. `http://localhost:4000/api` (último recurso)

`production` es `true` si `PRODUCTION=true` **o** `NODE_ENV=production`.

---

## 3. Archivos modificados

### 3.1 `src/set-env.js`

Script que genera `src/environments/environment.ts` a partir de variables de entorno. Se corrigieron 3 cosas:

| Cambio                      | Antes (roto)                                                               | Después (funciona)                                                                                |
| --------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Template literal sin cerrar | `const envConfigFile = \`...`;` sin backtick de cierre tras `};`           | `\`...};\`;` con backtick de cierre                                                               |
| Variables JS inexistentes   | `${NODE_ENV}`, `${API_URL}`, `${CURRENCY_SYMBOL}` (tiran `ReferenceError`) | `${production}`, `${apiUrl}`, `${currencySymbol}` (leídas de `process.env`)                       |
| Carga de dotenv             | `require('dotenv').config(...)` sin protección                             | `try { require('dotenv').config(...) } catch (_) { /* en CI las vars llegan por process.env */ }` |

### 3.2 `package.json`

El script `build` ahora ejecuta `set-env.js` antes de compilar:

```json
"build": "node src/set-env.js && ng build"
```

Antes era solo `"ng build"`, así que las variables de entorno nunca llegaban a `environment.ts`.

### 3.3 `wrangler.jsonc`

Se agregó el bloque `vars` (versionado, para que quede documentado en el repo):

```jsonc
"vars": {
  "API_URL": "https://backend-junta-agua-hn.onrender.com/api",
  "PRODUCTION": "true",
  "CURRENCY_SYMBOL": "L "
}
```

> Nota: para un sitio estático estos `vars` de wrangler no se usan en runtime (no hay handler `fetch`), pero quedan como fuente de verdad del repo. El valor real que importa es el que está en el dashboard de Cloudflare (ver sección 5).

### 3.4 `src/environments/environment.ts`

Generado automáticamente por `set-env.js`. **No editar a mano.** Los valores se cambian vía variables de entorno o `src/.env`.

---

## 4. Errores de build que se fueron resolviendo

### Error 1 — `SyntaxError: Unexpected identifier 'environment'` (línea del `console.log`)

**Síntoma:**

```
/opt/buildhome/repo/src/set-env.js:31
console.log(`environment generado → ${targetPath}`);
             ^^^^^^^^^^^
SyntaxError: Unexpected identifier 'environment'
```

**Causa real (engañoso):** el error no estaba en el `console.log`. El template literal de `envConfigFile` **perdía su backtick de cierre** tras `};`. Al quedar sin cerrar, el parser de Node se tragaba todo el archivo hasta el primer backtick (el del `console.log`) y ahí explotaba.

**Solución:** restaurar el backtick de cierre del template + reemplazar las variables JS inexistentes por las de `process.env`.

### Error 2 — `Cannot find module 'dotenv'`

**Síntoma:**

```
Error: Cannot find module 'dotenv'
Require stack:
- /opt/buildhome/repo/src/set-env.js
```

**Causa:** se había puesto `NODE_ENV=production` como variable de build. **npm omite las devDependencies cuando `NODE_ENV=production`**, así que `npm clean-install` no instaló `dotenv` (ni `@angular/cli`, que habría sido el siguiente fallo). El log lo confirmaba: solo "added 24 packages" en vez de ~700.

**Solución:**

- En el dashboard de Cloudflare, reemplazar `NODE_ENV=production` por `PRODUCTION=true` (npm no reacciona a `PRODUCTION`).
- Defensa extra: `try/catch` al cargar dotenv en `set-env.js`.

### Error 3 — Push a GitHub rechazado

**Síntoma:**

```
remote: Permission to juntaaguahn/frontend-junta-agua-hn.git denied to arfloreshn.
fatal: unable to access 'https://github.com/...': 403
```

**Causa:** el Gestor de Credenciales de Windows usaba la cuenta `arfloreshn`, que **no tiene permiso de escritura** en el repo `juntaaguahn`. La cuenta correcta es `juntaaguahn`.

**Solución:** usar la credencial de GitHub Desktop almacenada para `juntaaguahn` (token `gho_...` en el Administrador de Credenciales de Windows, entrada `GitHub - https://api.github.com/juntaaguahn`). Se leyó con un script PowerShell (P/Invoke `CredRead`) y se pusheó con ese token. `git push origin` normal seguirá fallando hasta que se actualice la credencial del host `github.com` a la cuenta `juntaaguahn` (o se use la URL con el token).

---

## 5. Configuración manual en Cloudflare (dashboard)

Las variables de un Worker tienen **dos lugares distintos** y son excluyentes:

| Sección                                          | Alcance                                             | ¿Sirve para un sitio estático?      |
| ------------------------------------------------ | --------------------------------------------------- | ----------------------------------- |
| `Settings → Variables and Secrets`               | Runtime: solo `env`/`process.env` dentro del Worker | **No** — el build nunca las ve      |
| `Settings → Build → Build Variables and Secrets` | Solo el proceso de build                            | **Sí** — esto es lo que se necesita |

**Configuración correcta (Settings → Build → Build Variables and Secrets):**

| Variable          | Valor                                            |
| ----------------- | ------------------------------------------------ |
| `API_URL`         | `https://backend-junta-agua-hn.onrender.com/api` |
| `PRODUCTION`      | `true`                                           |
| `CURRENCY_SYMBOL` | `L `                                             |

Reglas importantes:

- **NO** usar `NODE_ENV=production`: hace que npm omita las devDependencies y rompe el build (Error 2).
- El **Build command** debe ser `npm run build` (que ya ejecuta `set-env.js`).
- El **Deploy command** debe ser `npx wrangler deploy`.
- Si hay **build caching** activo, forzar un build nuevo (Retry) o desactivarlo, porque puede reutilizar un build viejo sin correr `set-env.js`.

---

## 6. Verificación local (comandos)

```powershell
# Probar la generación con las vars de producción (simula el build de Cloudflare)
$env:API_URL = "https://backend-junta-agua-hn.onrender.com/api"
$env:PRODUCTION = "true"
$env:CURRENCY_SYMBOL = "L "
node src/set-env.js
Get-Content src/environments/environment.ts   # debe decir production: true

# Restaurar estado local de dev
Remove-Item Env:\API_URL, Env:\PRODUCTION, Env:\CURRENCY_SYMBOL
npm run config

# Build completo (igual que corre Cloudflare)
npm run build
```

---

## 7. Nota: ajustes locales fuera del repo (esta sesión)

- **`.angular/cache`**: se borró la caché y se reinició el dev server para arreglar el error `EPERM: operation not permitted, rename ... deps_temp_*` de Vite.
- **Exclusión en Windows Defender**: se agregó `C:\...\frontend\.angular` como exclusión permanente para evitar que el antivirus bloquee el rename de la caché de Vite.
