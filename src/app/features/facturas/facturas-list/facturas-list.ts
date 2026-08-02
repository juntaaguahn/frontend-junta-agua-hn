import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DataViewModule } from 'primeng/dataview';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { FacturasService } from '../../../core/services/facturas.service';
import { LecturasService } from '../../../core/services/lecturas.service';
import { AbonadosService } from '../../../core/services/abonados.service';
import { DialogModule } from 'primeng/dialog';
import { Lectura } from '../../../core/models';

@Component({
  selector: 'app-facturas-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DataViewModule,
    ButtonModule,
    SelectModule,
    DialogModule,
    TagModule,
    SkeletonModule,
    TooltipModule,
    ToastModule,
  ],
  templateUrl: './facturas-list.html',
  styleUrl: './facturas-list.scss',
})
export class FacturasList implements OnInit {
  private facturasSvc = inject(FacturasService);
  private lecturasSvc = inject(LecturasService);
  private abonadosSvc = inject(AbonadosService);
  private router = inject(Router);
  private msgs = inject(MessageService);

  data = signal<Lectura[]>([]);
  cargando = signal(false);
  total = signal(0);

  sectorFiltro = signal<string | null>(null);
  sectores = signal<string[]>([]);
  abonadoFiltro = signal<number | null>(null);
  abonadosOpts = signal<{ id: number; nombre: string; codigo: string }[]>([]);

  lecturasFiltradas = computed(() => {
    let items = this.data();
    if (this.sectorFiltro()) {
      items = items.filter((l) => l.sector === this.sectorFiltro());
    }
    if (this.abonadoFiltro()) {
      items = items.filter((l) => l.abonado_id === this.abonadoFiltro());
    }
    return items;
  });

  showMasivaDialog = signal(false);
  facturando = signal(false);

  private cacheKey = '';
  private cacheData: Lectura[] = [];

  ngOnInit() {
    this.cargar();
    this.abonadosSvc.sectores().subscribe((s) => this.sectores.set(s));
    this.abonadosSvc.list({ limit: 10000 }).subscribe((res) => {
      this.abonadosOpts.set(
        res.data
          .filter((a) => a.id != null)
          .map((a) => ({ id: a.id!, nombre: a.nombre, codigo: a.codigo }))
          .sort((a, b) => a.nombre.localeCompare(b.nombre)),
      );
    });
  }

  private rangoFechas(): { desde: string; hasta: string } {
    const ahora = new Date();
    const hasta = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 1);
    const desde = new Date(ahora.getFullYear(), ahora.getMonth() - 2, 1);
    return {
      desde: desde.toISOString().slice(0, 10),
      hasta: hasta.toISOString().slice(0, 10),
    };
  }

  cargar(refresh = false) {
    const rango = this.rangoFechas();
    const key = `${rango.desde}_${rango.hasta}`;

    if (!refresh && this.cacheKey === key) {
      this.data.set(this.cacheData);
      return;
    }

    this.cargando.set(true);
    this.lecturasSvc
      .list({
        facturada: false,
        fecha_desde: rango.desde,
        fecha_hasta: rango.hasta,
        limit: 200,
      })
      .subscribe({
        next: (res) => {
          this.data.set(res.data);
          this.total.set(res.total);
          this.cacheKey = key;
          this.cacheData = res.data;
          this.cargando.set(false);
        },
        error: () => {
          this.cargando.set(false);
          this.msgs.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudieron cargar las lecturas disponibles',
          });
        },
      });
  }

  onPage(event: any) {
    this.cargar();
  }

  verDetalle(id?: number) {
    if (!id) return;
    this.router.navigate(['/lecturas', id]);
  }

  nuevaFactura(l: Lectura) {
    this.router.navigate(['/facturas', 'nuevo'], {
      queryParams: {
        lectura_id: l.id,
        abonado_id: l.abonado_id,
        periodo: l.periodo,
        consumo_m3: l.consumo_m3,
      },
    });
  }

  abrirMasiva() {
    this.showMasivaDialog.set(true);
  }

  facturarMasiva() {
    const ids = this.lecturasFiltradas()
      .map((l) => l.id)
      .filter(Boolean) as number[];
    if (!ids.length) {
      this.msgs.add({
        severity: 'warn',
        summary: 'Sin datos',
        detail: 'No hay lecturas para facturar',
      });
      return;
    }
    this.showMasivaDialog.set(false);
    this.facturando.set(true);
    this.facturasSvc.facturarLecturas(ids).subscribe({
      next: (res: any) => {
        this.facturando.set(false);
        this.msgs.add({
          severity: res.errores ? 'warn' : 'success',
          summary: 'Facturación masiva',
          detail: res.mensaje || `${res.generadas} facturas generadas`,
        });
        this.cargar(true);
      },
      error: (err) => {
        this.facturando.set(false);
        const msg = err.error?.message || err.message || 'Error al facturar';
        this.msgs.add({ severity: 'error', summary: 'Error', detail: msg });
      },
    });
  }

  trackById(_: number, item: Lectura): number {
    return item.id!;
  }
}
