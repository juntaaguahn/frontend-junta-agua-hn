import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { MessageService } from 'primeng/api';
import { ReportesService } from '../../../core/services/reportes.service';
import { ReporteMorosidad as ReporteMorosidadData } from '../../../core/models';
import { AbonadosService } from '../../../core/services/abonados.service';

@Component({
  selector: 'app-reporte-morosidad',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    TableModule,
    SelectModule,
    SkeletonModule,
    TagModule,
  ],
  templateUrl: './reporte-morosidad.html',
  styleUrl: './reporte-morosidad.scss',
})
export class ReporteMorosidad implements OnInit {
  private reportes = inject(ReportesService);
  private abonados = inject(AbonadosService);
  private msgs = inject(MessageService);

  cargando = signal(false);
  reporte = signal<ReporteMorosidadData | null>(null);

  sectorFiltro = signal<string>('');
  sectores = signal<{ label: string; value: string }[]>([]);

  ngOnInit() {
    this.cargarSectores();
    this.generar();
  }

  private cargarSectores() {
    this.abonados.sectores().subscribe({
      next: (s) => {
        const opts = [{ label: 'Todos los sectores', value: '' }];
        s.forEach((sec) => opts.push({ label: sec, value: sec }));
        this.sectores.set(opts);
      },
      error: () => {},
    });
  }

  generar() {
    this.cargando.set(true);
    const sector = this.sectorFiltro() || undefined;
    this.reportes.morosidad(sector).subscribe({
      next: (data) => {
        this.reporte.set(data);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.msgs.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo generar el reporte de morosidad',
        });
      },
    });
  }

  limpiarFiltros() {
    this.sectorFiltro.set('');
    this.generar();
  }

  imprimir() {
    window.print();
  }

  hoy(): string {
    return new Date().toLocaleString('es');
  }

  severityDias(dias: number): 'success' | 'warn' | 'danger' {
    if (dias <= 0) return 'success';
    if (dias <= 30) return 'warn';
    return 'danger';
  }
}
