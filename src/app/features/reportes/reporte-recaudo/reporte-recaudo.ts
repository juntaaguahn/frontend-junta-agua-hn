import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { DatePickerModule } from 'primeng/datepicker';
import { SkeletonModule } from 'primeng/skeleton';
import { MessageService } from 'primeng/api';
import { ReportesService } from '../../../core/services/reportes.service';
import { ReporteRecaudo as ReporteRecaudoData } from '../../../core/models';

@Component({
  selector: 'app-reporte-recaudo',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    TableModule,
    DatePickerModule,
    SkeletonModule,
  ],
  templateUrl: './reporte-recaudo.html',
  styleUrl: './reporte-recaudo.scss',
})
export class ReporteRecaudo implements OnInit {
  private reportes = inject(ReportesService);
  private msgs = inject(MessageService);

  cargando = signal(false);
  reporte = signal<ReporteRecaudoData | null>(null);

  // Filtros: por defecto, el mes actual
  desFiltro = signal<Date | null>(this.primerDiaMes());
  hastaFiltro = signal<Date | null>(new Date());

  ngOnInit() {
    this.generar();
  }

  generar() {
    this.cargando.set(true);
    const des = this.toFecha(this.desFiltro());
    const hasta = this.toFecha(this.hastaFiltro());
    this.reportes.recaudo(des, hasta).subscribe({
      next: (data) => {
        this.reporte.set(data);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.msgs.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo generar el reporte de recaudo',
        });
      },
    });
  }

  limpiarFiltros() {
    this.desFiltro.set(this.primerDiaMes());
    this.hastaFiltro.set(new Date());
    this.generar();
  }

  imprimir() {
    window.print();
  }

  hoy(): string {
    return new Date().toLocaleString('es');
  }

  private primerDiaMes(): Date {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }

  private toFecha(d: Date | null): string {
    if (!d) return '';
    const date = d instanceof Date ? d : new Date(d);
    return date.toISOString().slice(0, 10);
  }
}
