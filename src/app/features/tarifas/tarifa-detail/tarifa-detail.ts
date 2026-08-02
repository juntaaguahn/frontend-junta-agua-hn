import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { SkeletonModule } from 'primeng/skeleton';
import { MessageService } from 'primeng/api';
import { TarifasService } from '../../../core/services/tarifas.service';
import { NavegacionService } from '../../../core/services/navegacion.service';
import type { Tarifa } from '../../../core/models';

@Component({
  selector: 'app-tarifa-detail',
  standalone: true,
  imports: [CommonModule, ButtonModule, TagModule, SkeletonModule],
  templateUrl: './tarifa-detail.html',
  styleUrl: './tarifa-detail.scss',
})
export class TarifaDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private service = inject(TarifasService);
  private msgs = inject(MessageService);
  private nav = inject(NavegacionService);

  cargando = signal(true);
  tarifa = signal<Tarifa | null>(null);

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.service.get(+id).subscribe({
      next: (t) => {
        this.tarifa.set(t);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.msgs.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo cargar la tarifa',
        });
      },
    });
  }

  editar() {
    const t = this.tarifa();
    if (!t?.id) return;
    this.router.navigate(['/tarifas', t.id, 'editar']);
  }

  volver() {
    this.nav.volver(['/tarifas']);
  }

  severityFor(estado: 'activo' | 'inactivo'): 'success' | 'danger' {
    return estado === 'activo' ? 'success' : 'danger';
  }
}
