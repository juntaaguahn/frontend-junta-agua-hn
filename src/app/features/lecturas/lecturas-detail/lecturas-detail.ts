import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { MessageService } from 'primeng/api';
import { LecturasService } from '../../../core/services/lecturas.service';
import { NavegacionService } from '../../../core/services/navegacion.service';
import { Lectura } from '../../../core/models';

@Component({
  selector: 'app-lecturas-detail',
  standalone: true,
  imports: [CommonModule, ButtonModule, SkeletonModule],
  templateUrl: './lecturas-detail.html',
  styleUrl: './lecturas-detail.scss',
})
export class LecturasDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private nav = inject(NavegacionService);
  private service = inject(LecturasService);
  private msgs = inject(MessageService);

  selectSize: 'small' | 'large' = 'small';
  cargando = signal(true);
  lectura = signal<Lectura | null>(null);

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.service.get(+id).subscribe({
      next: (l) => {
        this.lectura.set(l);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.msgs.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo cargar la lectura',
        });
      },
    });
  }

  editar() {
    const id = this.lectura()?.id;
    if (id) this.router.navigate(['/lecturas', id, 'editar']);
  }

  volver() {
    this.nav.volver(['/lecturas']);
  }
}
