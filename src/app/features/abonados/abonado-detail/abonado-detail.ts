import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { SkeletonModule } from 'primeng/skeleton';
import { MessageService } from 'primeng/api';
import { ReportesService } from '../../../core/services/reportes.service';
import { NavegacionService } from '../../../core/services/navegacion.service';
import { EstadoAbonado } from '../../../core/models';

@Component({
  selector: 'app-abonado-detail',
  standalone: true,
  imports: [CommonModule, DecimalPipe, ButtonModule, TagModule, TableModule, SkeletonModule],
  templateUrl: './abonado-detail.html',
  styleUrl: './abonado-detail.scss',
})
export class AbonadoDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private reportes = inject(ReportesService);
  private msgs = inject(MessageService);
  private nav = inject(NavegacionService);

  cargando = signal(true);
  abonado = signal<any>(null);
  resumen = signal<any>(null);
  lecturas = signal<any[]>([]);
  facturas = signal<any[]>([]);
  pagos = signal<any[]>([]);

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.reportes.abonado(+id).subscribe({
      next: (data) => {
        this.abonado.set(data.abonado);
        this.resumen.set(data.resumen);
        this.lecturas.set(data.lecturas);
        this.facturas.set(data.facturas);
        this.pagos.set(data.pagos);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.msgs.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo cargar el abonado',
        });
      },
    });
  }

  editar() {
    this.router.navigate(['/abonados', this.abonado().id, 'editar']);
  }

  volver() {
    this.nav.volver(['/abonados']);
  }

  severityFor(estado: EstadoAbonado): 'success' | 'warn' | 'danger' {
    switch (estado) {
      case 'activo':
        return 'success';
      case 'suspendido':
        return 'warn';
      case 'cortado':
        return 'danger';
    }
  }

  estadoLabel(estado: EstadoAbonado): string {
    switch (estado) {
      case 'activo':
        return 'Activo';
      case 'suspendido':
        return 'Suspendido';
      case 'cortado':
        return 'Cortado';
    }
  }

  severityFactura(estado: string): 'success' | 'warn' | 'danger' | 'secondary' {
    switch (estado) {
      case 'pagada':
        return 'success';
      case 'pendiente':
        return 'warn';
      case 'vencida':
        return 'danger';
      default:
        return 'secondary';
    }
  }
}
