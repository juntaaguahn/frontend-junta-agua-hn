import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ChartModule } from 'primeng/chart';
import { SkeletonModule } from 'primeng/skeleton';
import { ReportesService } from '../../../core/services/reportes.service';
import { ReporteResumen as ReporteResumenData } from '../../../core/models';

@Component({
  selector: 'app-reporte-resumen',
  standalone: true,
  imports: [CommonModule, ChartModule, SkeletonModule],
  templateUrl: './reporte-resumen.html',
  styleUrl: './reporte-resumen.scss',
})
export class ReporteResumen implements OnInit {
  private reportes = inject(ReportesService);
  private router = inject(Router);

  cargando = signal(true);
  resumen = signal<ReporteResumenData | null>(null);
  chartData = signal<any>(null);

  chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value: number | string) => `L ${Number(value).toLocaleString('es-HN')}`,
        },
        grid: { color: '#e2e8f0' },
      },
      x: {
        grid: { display: false },
        ticks: { font: { weight: 'bold', size: 11 } },
      },
    },
  };

  ngOnInit() {
    this.reportes.resumen().subscribe({
      next: (resumen) => {
        this.resumen.set(resumen);
        this.chartData.set({
          labels: ['Total facturado', 'Total pagado', 'Total en mora'],
          datasets: [
            {
              data: [
                resumen.totales.total_facturado,
                resumen.totales.total_pagado,
                resumen.totales.total_mora,
              ],
              backgroundColor: ['#2563eb', '#16a34a', '#dc2626'],
              borderRadius: 8,
              borderSkipped: false,
              barPercentage: 0.6,
            },
          ],
        });
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

  verDetalle(tipo: 'facturado' | 'pagado' | 'mora') {
    const rutas = {
      facturado: '/facturas',
      pagado: '/pagos',
      mora: '/reportes/morosidad',
    };
    this.router.navigate([rutas[tipo]]);
  }
}
