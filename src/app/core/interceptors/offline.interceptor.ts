import {
  HttpErrorResponse,
  HttpEvent,
  HttpEventType,
  HttpInterceptorFn,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, catchError, from, map, of, switchMap, tap, throwError } from 'rxjs';
import { OfflineService, requestKey } from '../services/offline.service';
import { AuthService } from '../services/auth.service';

function isConnectionError(err: unknown): boolean {
  const status = (err as { status?: number })?.status;
  return status === 0 || status === 502 || status === 503 || status === 504;
}

/**
 * Modo offline:
 * - Detecta la caída del backend y sirve datos cacheados (réplica IndexedDB).
 * - Guarda write-through cada GET exitoso y encola mutaciones mientras está offline.
 * - El usuario con sesión previa entra directo en modo offline.
 */
export const offlineInterceptor: HttpInterceptorFn = (req, next) => {
  const offline = inject(OfflineService);
  const auth = inject(AuthService);

  // Rutas que siempre requieren red (no se cachean ni encolan).
  // X-Offline-Sync marca reintentos de la cola de sincronización para evitar re-encolarlos.
  const requiresNetwork =
    req.responseType === 'blob' ||
    req.url.includes('/todopago') ||
    req.url.includes('/api/chat') ||
    req.url.endsWith('/auth/login') ||
    req.url.includes('/auth/refresh') ||
    req.url.endsWith('/auth/logout') ||
    req.url.includes('/api/health') ||
    req.headers.has('X-Offline-Sync');

  if (requiresNetwork) {
    return next(req).pipe(
      catchError((err: HttpErrorResponse) => {
        if (isConnectionError(err)) offline.markOffline();
        return throwError(() => err);
      }),
    );
  }

  return next(req).pipe(
    tap((res: HttpEvent<unknown>) => {
      offline.markOnline();
      if (req.method === 'GET' && res.type === HttpEventType.Response) {
        const body = (res as { body?: unknown }).body;
        if (body != null) void offline.cacheResponse(requestKey(req), body);
      }
    }),
    catchError((err: HttpErrorResponse): Observable<HttpEvent<unknown>> => {
      if (isConnectionError(err)) {
        offline.markOffline();

        // Sesión vigente sin conexión
        if (req.url.endsWith('/auth/me')) {
          const user = auth.user();
          if (user) return of(new HttpResponse({ body: user, status: 200 }));
        }

        // Lecturas: servir réplica local
        if (req.method === 'GET') {
          return from(offline.serveCachedGet(req)).pipe(
            switchMap((cached) =>
              cached !== undefined && cached !== null
                ? (of(new HttpResponse({ body: cached, status: 200 })) as Observable<
                    HttpEvent<unknown>
                  >)
                : throwError(
                    () =>
                      new HttpErrorResponse({
                        status: 0,
                        statusText: 'OFFLINE',
                        url: req.url,
                      }),
                  ),
            ),
          );
        }

        // Escrituras: encolar y responder optimista
        if (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE') {
          return from(offline.queueMutation(req)).pipe(
            map((body) => new HttpResponse({ body, status: 200 })),
          );
        }
      }
      return throwError(() => err);
    }),
  );
};
