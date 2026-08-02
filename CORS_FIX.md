# Diagnóstico del bloqueo de login

## ¿Qué estaba fallando?

Al intentar iniciar sesión desde el frontend (Angular en `http://localhost:4200`) contra el
backend (`http://localhost:4000`), el navegador bloqueaba la petición con este error:

> Access to XMLHttpRequest at 'http://localhost:4000/api/auth/login' from origin
> 'http://localhost:4200' has been blocked by CORS policy: Response to preflight
> request doesn't pass access control check: No 'Access-Control-Allow-Origin' header
> is present on the requested resource.

## ¿Cuál era la causa raíz?

Había dos problemas encadenados:

1. **CORS mal configurado en el backend.**
   En `backend/.env` estaba `CORS_ORIGIN=*` (permitir cualquier origen). Ese comodín
   no funciona cuando además se usan credenciales (`credentials: true`, que el
   frontend envía). El navegador exige que `Access-Control-Allow-Origin` sea un
   origen concreto y NO un `*`, así que rechazaba la respuesta.

2. **Nodemon no recargaba cambios del `.env`.**
   Nodemon vigila por defecto solo archivos con extensión `js`, `mjs`, `cjs`, `json`.
   Al modificar `.env` no detectaba el cambio, así que el servidor seguía corriendo con
   la configuración antigua (`CORS_ORIGIN=*`).

## ¿Cómo se solucionó?

1. **Se corrigió el origen permitido** en `backend/.env`:

   ```diff
   - CORS_ORIGIN=*
   + CORS_ORIGIN=http://localhost:4200
   ```

   Ahora el backend responde a la petición preflight (OPTIONS) con
   `Access-Control-Allow-Origin: http://localhost:4200`, exactamente el origen que
   el navegador espera.

2. **Se reinició el backend manualmente** (matar el proceso que ocupaba el puerto 4000
   y volver a ejecutar `npm run dev`), porque Nodemon no se entera de los cambios
   hechos en `.env`.

## Verificación

Se comprobó con una petición OPTIONS simulando el origen del frontend:

- `Access-Control-Allow-Origin: http://localhost:4200` ✔
- `Access-Control-Allow-Credentials: true` ✔

Después del ajuste, el login volvió a funcionar correctamente.

> **Nota para el futuro:** si se cambia el puerto del frontend o se usa un túnel,
> hay que actualizar `CORS_ORIGIN` con el nuevo origen y **reiniciar el backend
> manualmente** (no depende de Nodemon).
