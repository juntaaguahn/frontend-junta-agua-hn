import { HttpInterceptorFn } from '@angular/common/http';

/**
 * Envía todas las peticiones con `withCredentials: true` para que el navegador
 * incluya las cookies HttpOnly (ja_token / ja_refresh) en llamadas cross-origin
 * (dev: localhost:4200 → localhost:4000). En producción (mismo origen) es inocuo.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req.clone({ withCredentials: true }));
};
