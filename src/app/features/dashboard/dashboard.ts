import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ChartModule } from 'primeng/chart';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { DashboardService } from '../../core/services/dashboard.service';
import { DashboardStats } from '../../core/models';
import { Subscription } from 'rxjs';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, ButtonModule, ChartModule, SkeletonModule, TooltipModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit, OnDestroy {
  private service = inject(DashboardService);
  private router = inject(Router);
  private sub?: Subscription;

  stats = signal<DashboardStats | null>(null);
  cargando = signal(true);

  chartConceptosData = signal<any>(null);
  readonly cs = environment.currencySymbol;

  chartConceptosOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { callback: (v: any) => this.cs + v },
        grid: { color: '#e2e8f0' },
      },
      x: {
        grid: { display: false },
        ticks: { font: { weight: 'bold', size: 11 } },
      },
    },
  };

  moraPorcentaje = signal(0);

  ngOnInit() {
    this.sub = this.service.getStats().subscribe({
      next: (data) => {
        this.stats.set(data);
        this.buildConceptosChart(data);
        this.moraPorcentaje.set(
          data.totalFacturasMes > 0
            ? Math.round((data.alertas.facturasVencidas.cantidad / data.totalFacturasMes) * 100)
            : 0,
        );
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  private buildConceptosChart(data: DashboardStats) {
    const d = data.desgloseRecaudoHoy;
    this.chartConceptosData.set({
      labels: ['Agua Base', 'Excedente m³', 'Alcantarillado', 'Recargos Mora', 'Multas/Otros'],
      datasets: [
        {
          data: [d.agua_base, d.excedente, d.alcantarillado, d.mora, d.multas],
          backgroundColor: ['#2563eb', '#0284c7', '#0d9488', '#f59e0b', '#ef4444'],
          borderRadius: 8,
          borderSkipped: false,
          barPercentage: 0.6,
        },
      ],
    });
  }

  navegar(path: string) {
    this.router.navigate([path]);
  }
}
