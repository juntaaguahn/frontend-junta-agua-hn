import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, Subscription } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { DataViewModule } from 'primeng/dataview';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { DatePickerModule } from 'primeng/datepicker';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { TagModule } from 'primeng/tag';
import { InputNumberModule } from 'primeng/inputnumber';
import { ConfirmationService, MessageService } from 'primeng/api';

import { PagosService } from '../../../core/services/pagos.service';
import { AbonadosService } from '../../../core/services/abonados.service';
import { FacturasService } from '../../../core/services/facturas.service';
import { LecturasService } from '../../../core/services/lecturas.service';
import { Pago, Abonado, Factura, Lectura } from '../../../core/models';

@Component({
  selector: 'app-pagos-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    DataViewModule,
    InputTextModule,
    SelectModule,
    SkeletonModule,
    TooltipModule,
    DatePickerModule,
    ConfirmDialogModule,
    ToastModule,
    TagModule,
    InputNumberModule,
  ],
  templateUrl: './pagos-list.html',
  styleUrl: './pagos-list.scss',
  providers: [ConfirmationService, MessageService],
})
export class PagosList implements OnInit, OnDestroy {
  private service = inject(PagosService);
  private abonadosSvc = inject(AbonadosService);
  private facturasSvc = inject(FacturasService);
  private lecturasSvc = inject(LecturasService);
  private router = inject(Router);
  private confirm = inject(ConfirmationService);
  private msgs = inject(MessageService);

  // Abonados panel
  searchTerm = signal('');
  abonados = signal<Abonado[]>([]);
  abonadosCargando = signal(false);
  abonadosPage = signal(1);
  abonadosTotal = signal(0);
  hasMoreAbonados = computed(() => this.abonados().length < this.abonadosTotal());
  search$ = new Subject<string>();
  private searchSub?: Subscription;

  // Selected
  selectedAbonado = signal<Abonado | null>(null);
  facturasPend = signal<Factura[]>([]);
  facturaSel = signal<Factura | null>(null);
  lecturaSel = signal<Lectura | null>(null);
  detalleCargando = signal(false);

  // Pagos historial table (when no abonado selected)
  data = signal<Pago[]>([]);
  total = signal(0);
  cargando = signal(false);
  desFiltro = signal<Date | null>(null);
  hastaFiltro = signal<Date | null>(null);
  private page = 1;
  private limit = 100;

  mobilePanel = signal<'lista' | 'detalle'>('lista');

  readonly LIMIT = 20;

  ngOnInit() {
    this.cargarAbonados();
    this.cargarPagos();

    this.searchSub = this.search$.pipe(debounceTime(300), distinctUntilChanged()).subscribe(() => {
      this.abonadosPage.set(1);
      this.abonados.set([]);
      this.cargarAbonados();
    });
  }

  ngOnDestroy() {
    this.searchSub?.unsubscribe();
  }

  // ---- Abonados ----

  cargarAbonados() {
    this.abonadosCargando.set(true);
    const q = this.searchTerm() || undefined;
    this.abonadosSvc.list({ q, page: this.abonadosPage(), limit: this.LIMIT }).subscribe({
      next: (res) => {
        const conSaldo = res.data.filter((a) => a.saldo_pendiente != null && a.saldo_pendiente > 0);
        this.abonados.update((prev) => [...prev, ...conSaldo]);
        this.abonadosTotal.set(res.total);
        this.abonadosCargando.set(false);
      },
      error: () => this.abonadosCargando.set(false),
    });
  }

  onSearchInput(value: string) {
    this.searchTerm.set(value);
    this.search$.next(value);
  }

  onAbonadosScroll(e: Event) {
    const el = e.target as HTMLElement;
    const threshold = 80;
    if (
      el.scrollTop + el.clientHeight >= el.scrollHeight - threshold &&
      !this.abonadosCargando() &&
      this.hasMoreAbonados()
    ) {
      this.abonadosPage.update((p) => p + 1);
      this.cargarAbonados();
    }
  }

  seleccionar(a: Abonado) {
    this.selectedAbonado.set(a);
    this.facturaSel.set(null);
    this.lecturaSel.set(null);
    this.mobilePanel.set('detalle');
    this.detalleCargando.set(true);
    this.facturasSvc.list({ abonado_id: a.id, estado: 'pendiente', limit: 10 }).subscribe({
      next: (res) => {
        this.facturasPend.set(res.data);
        if (res.data.length > 0) {
          const f = res.data[0];
          this.facturaSel.set(f);
          if (f.lectura_id) {
            this.lecturasSvc.get(f.lectura_id).subscribe({
              next: (l) => this.lecturaSel.set(l),
            });
          }
        }
        this.detalleCargando.set(false);
      },
      error: () => {
        this.facturasPend.set([]);
        this.detalleCargando.set(false);
      },
    });
  }

  facturaClick(f: Factura) {
    this.facturaSel.set(f);
    this.lecturaSel.set(null);
    if (f.lectura_id) {
      this.lecturasSvc.get(f.lectura_id).subscribe({
        next: (l) => this.lecturaSel.set(l),
      });
    }
  }

  irACobrar() {
    const a = this.selectedAbonado();
    const f = this.facturaSel();
    if (!a?.id) return;
    const qp: Record<string, string | number> = {
      abonado_id: a.id,
      abonado_nombre: a.nombre,
      abonado_codigo: a.codigo || '',
    };
    if (f?.id) qp['factura_id'] = f.id;
    this.router.navigate(['/pagos/nuevo'], { queryParams: qp });
  }

  volverALista() {
    this.mobilePanel.set('lista');
  }

  // ---- Pagos historial table ----

  cargarPagos() {
    this.cargando.set(true);
    const des = this.desFiltro();
    const hasta = this.hastaFiltro();
    this.service
      .list({
        q: this.searchTerm() || undefined,
        des: des
          ? (des instanceof Date ? des : new Date(des)).toISOString().slice(0, 10)
          : undefined,
        hasta: hasta
          ? (hasta instanceof Date ? hasta : new Date(hasta)).toISOString().slice(0, 10)
          : undefined,
        page: this.page,
        limit: this.limit,
      })
      .subscribe({
        next: (res) => {
          this.data.set(res.data);
          this.total.set(res.total);
          this.cargando.set(false);
        },
        error: () => this.cargando.set(false),
      });
  }

  buscarPagos() {
    this.page = 1;
    this.cargarPagos();
  }

  limpiarFiltros() {
    this.desFiltro.set(null);
    this.hastaFiltro.set(null);
    this.buscarPagos();
  }

  onPage(e: any) {
    this.page = Math.floor(e.first / e.rows) + 1;
    this.limit = e.rows;
    this.cargarPagos();
  }

  nuevo() {
    this.router.navigate(['/pagos/nuevo']);
  }
  ver(id: number) {
    this.router.navigate(['/pagos', id]);
  }

  anular(pago: Pago, e?: Event) {
    e?.stopPropagation();
    this.confirm.confirm({
      message: `¿Anular pago #${pago.id} de $${pago.monto?.toFixed(2)}?`,
      header: 'Confirmar anulación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, anular',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.service.delete(pago.id!).subscribe({
          next: () => {
            this.msgs.add({
              severity: 'success',
              summary: 'Anulado',
              detail: 'Pago anulado correctamente',
            });
            this.cargarPagos();
          },
          error: () => {
            this.msgs.add({
              severity: 'error',
              summary: 'Error',
              detail: 'No se pudo anular el pago',
            });
          },
        });
      },
    });
  }

  metodoLabel(metodo: string): string {
    const map: Record<string, string> = {
      efectivo: 'Efectivo',
      transferencia: 'Transferencia',
      cheque: 'Cheque',
      tarjeta: 'Tarjeta',
    };
    return map[metodo] || metodo;
  }

  estadoColor(estado: string): string {
    return estado === 'pendiente' ? 'warn' : estado === 'pagada' ? 'success' : 'danger';
  }

  totalFacturasPend = computed(() =>
    this.facturasPend().reduce((sum, f) => sum + Number(f.total), 0),
  );

  trackById(_: number, p: Pago): number {
    return p.id!;
  }
}
