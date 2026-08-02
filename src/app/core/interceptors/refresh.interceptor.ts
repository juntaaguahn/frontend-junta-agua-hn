import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

const RETRY_HEADER = 'X-Auth-Retry';

/**
 * Refresco automático de sesión: si una petición responde 401 (access token
 * expirado), intenta renovarlo vía POST /auth/refresh (refresh token HttpOnly)
 * y reintenta la petición original una sola vez. Si el refresh falla, el 401
 * se propaga para que errorInterceptor cierre la sesión.
 */
export const refreshInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);

  const noRefrescar =
    req.headers.has(RETRY_HEADER) ||
    req.url.includes('/auth/login') ||
    req.url.includes('/auth/refresh') ||
    req.url.endsWith('/auth/logout');

  return next(req).pipe(
    catchError((err) => {
      if (err.status === 401 && !noRefrescar) {
        return from(auth.refreshSession()).pipe(
          switchMap(() => next(req.clone({ setHeaders: { [RETRY_HEADER]: '1' } }))),
          catchError(() => throwError(() => err)),
        );
      }
      return throwError(() => err);
    }),
  );
};
