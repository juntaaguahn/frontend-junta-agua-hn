import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

/**
 * Factory de guard de rol: permite la ruta solo si el usuario tiene uno de los
 * roles indicados. Complementa (no reemplaza) la validación server-side.
 */
export function rolGuard(...roles: string[]): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (auth.hasRole(...roles)) {
      return true;
    }

    router.navigate(['/dashboard']);
    return false;
  };
}
