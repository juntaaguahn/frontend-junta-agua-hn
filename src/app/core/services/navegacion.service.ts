import { Injectable, inject } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class NavegacionService {
  private location = inject(Location);
  private router = inject(Router);

  volver(fallback: string[]) {
    if (window.history.length > 1) {
      this.location.back();
    } else {
      this.router.navigate(fallback);
    }
  }
}
