import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { SkeletonModule } from 'primeng/skeleton';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { OrdenesService } from '../../../core/services/ordenes.service';
import { NavegacionService } from '../../../core/services/navegacion.service';
import type { OrdenCorte } from '../../../core/models';

@Component({
  selector: 'app-orden-detail',
  standalone: true,
  imports: [CommonModule, ButtonModule, TagModule, SkeletonModule, ConfirmDialogModule],
  templateUrl: './orden-detail.html',
  styleUrl: './orden-detail.scss',
})
export class OrdenDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private service = inject(OrdenesService);
  private msgs = inject(MessageService);
  private confirm = inject(ConfirmationService);
  private nav = inject(NavegacionService);

  cargando = signal(true);
  orden = signal<OrdenCorte | null>(null);

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.service.get(+id).subscribe({
      next: (o) => {
        this.orden.set(o);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.msgs.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Orden no encontrada',
        });
        this.volver();
      },
    });
  }

  ejecutar() {
    const o = this.orden();
    if (!o?.id) return;
    this.confirm.confirm({
      message: `¿Ejecutar orden de corte para "${o.abonado_nombre}"? El abonado pasará a estado "Cortado".`,
      header: 'Confirmar ejecución',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, ejecutar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.service.ejecutar(o.id!).subscribe({
          next: (actualizada) => {
            this.orden.set(actualizada);
            this.msgs.add({
              severity: 'success',
              summary: 'Ejecutada',
              detail: 'Orden ejecutada correctamente',
            });
          },
          error: () => {
            this.msgs.add({
              severity: 'error',
              summary: 'Error',
              detail: 'No se pudo ejecutar la orden',
            });
          },
        });
      },
    });
  }

  volver() {
    this.nav.volver(['/ordenes']);
  }

  estadoLabel(e: string): string {
    switch (e) {
      case 'pendiente':
        return 'Pendiente';
      case 'ejecutada':
        return 'Ejecutada';
      case 'anulada':
        return 'Anulada';
      default:
        return e;
    }
  }

  estadoSeverity(e: string): 'warn' | 'success' | 'danger' | 'secondary' {
    switch (e) {
      case 'pendiente':
        return 'warn';
      case 'ejecutada':
        return 'success';
      case 'anulada':
        return 'danger';
      default:
        return 'secondary';
    }
  }
}
