import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { SkeletonModule } from 'primeng/skeleton';
import { MessageService } from 'primeng/api';
import { TegresosService } from '../../../core/services/tegresos.service';
import { NavegacionService } from '../../../core/services/navegacion.service';
import type { Tegreso } from '../../../core/models';

@Component({
  selector: 'app-tegreso-detail',
  standalone: true,
  imports: [CommonModule, ButtonModule, TagModule, SkeletonModule],
  templateUrl: './tegreso-detail.html',
  styleUrl: './tegreso-detail.scss',
})
export class TegresoDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private service = inject(TegresosService);
  private msgs = inject(MessageService);
  private nav = inject(NavegacionService);

  cargando = signal(true);
  tegreso = signal<Tegreso | null>(null);

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.service.get(+id).subscribe({
      next: (t) => {
        this.tegreso.set(t);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.msgs.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo cargar el tipo de egreso',
        });
      },
    });
  }

  editar() {
    const t = this.tegreso();
    if (!t?.egresoId) return;
    this.router.navigate(['/tegresos', t.egresoId, 'editar']);
  }

  volver() {
    this.nav.volver(['/tegresos']);
  }

  statusLabel(s: 'Y' | 'N'): string {
    return s === 'Y' ? 'Activo' : 'Inactivo';
  }

  statusSeverity(s: 'Y' | 'N'): 'success' | 'danger' {
    return s === 'Y' ? 'success' : 'danger';
  }
}
