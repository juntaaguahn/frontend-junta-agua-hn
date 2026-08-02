import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { AuthService } from '../services/auth.service';

/**
 * Captura errores HTTP: muestra un toast y, si es 401, cierra sesión.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const messageService = inject(MessageService);
  const auth = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      let mensaje = 'Ocurrió un error inesperado';

      if (err.error?.error) {
        mensaje = err.error.error;
      } else if (err.error?.message) {
        mensaje = err.error.message;
      } else if (err.status === 0) {
        mensaje = 'No se pudo conectar con el servidor';
      } else if (err.status === 401) {
        mensaje = 'Sesión expirada. Vuelve a iniciar sesión.';
        auth.logout();
        router.navigate(['/login']);
      } else if (err.status === 403) {
        mensaje = 'No tienes permisos para esta acción';
      } else if (err.status === 404) {
        mensaje = 'Recurso no encontrado';
      }

      if (err.status === 0 || err.status === 502 || err.status === 503 || err.status === 504) {
        // Sin conexión: lo maneja el modo offline (réplica local / cola de sincronización)
        return throwError(() => err);
      }

      messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: mensaje,
        life: 4000,
      });

      return throwError(() => err);
    }),
  );
};
