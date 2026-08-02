import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DataViewModule, DataViewLazyLoadEvent } from 'primeng/dataview';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';
import { DatePickerModule } from 'primeng/datepicker';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { OrdenesService } from '../../../core/services/ordenes.service';
import type { OrdenCorte, Paginated } from '../../../core/models';

@Component({
  selector: 'app-ordenes-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DataViewModule,
    ButtonModule,
    TagModule,
    InputTextModule,
    DatePickerModule,
    TooltipModule,
    ToastModule,
    ConfirmDialogModule,
  ],
  templateUrl: './ordenes-list.html',
  styleUrl: './ordenes-list.scss',
  providers: [MessageService, ConfirmationService],
})
export class OrdenesList implements OnInit {
  private service = inject(OrdenesService);
  private router = inject(Router);
  private msgs = inject(MessageService);
  private confirm = inject(ConfirmationService);

  data = signal<OrdenCorte[]>([]);
  cargando = signal(false);
  total = signal(0);
  page = signal(1);
  limit = signal(20);

  estadoFiltro = signal<string | null>(null);
  q = signal('');
  desFiltro = signal<Date | null>(null);
  hastaFiltro = signal<Date | null>(null);

  readonly estadoOptions = [
    { label: 'Todas', value: null, icon: 'pi pi-list' },
    { label: 'Pendientes', value: 'pendiente', icon: 'pi pi-clock' },
    { label: 'Ejecutadas', value: 'ejecutada', icon: 'pi pi-check-circle' },
    { label: 'Anuladas', value: 'anulada', icon: 'pi pi-ban' },
  ];

  ngOnInit() {
    this.load();
  }

  load() {
    this.cargando.set(true);
    const des = this.desFiltro();
    const hasta = this.hastaFiltro();
    this.service
      .list({
        estado: this.estadoFiltro() || undefined,
        q: this.q() || undefined,
        des: des
          ? (des instanceof Date ? des : new Date(des)).toISOString().slice(0, 10)
          : undefined,
        hasta: hasta
          ? (hasta instanceof Date ? hasta : new Date(hasta)).toISOString().slice(0, 10)
          : undefined,
        page: this.page(),
        limit: this.limit(),
      })
      .subscribe({
        next: (res: Paginated<OrdenCorte>) => {
          this.data.set(res.data);
          this.total.set(res.total);
          this.cargando.set(false);
        },
        error: () => {
          this.cargando.set(false);
          this.msgs.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudieron cargar las órdenes',
          });
        },
      });
  }

  onPage(e: DataViewLazyLoadEvent) {
    this.page.set(Math.floor(e.first! / e.rows!) + 1);
    this.limit.set(e.rows!);
    this.load();
  }

  buscar() {
    this.page.set(1);
    this.load();
  }

  limpiarFiltros() {
    this.q.set('');
    this.desFiltro.set(null);
    this.hastaFiltro.set(null);
    this.buscar();
  }

  cambiarFiltro(estado: string | null) {
    this.estadoFiltro.set(estado);
    this.page.set(1);
    this.load();
  }

  ver(id?: number) {
    if (!id) return;
    this.router.navigate(['/ordenes', id]);
  }

  nuevo() {
    this.router.navigate(['/ordenes', 'nuevo']);
  }

  ejecutar(orden: OrdenCorte, e?: Event) {
    e?.stopPropagation();
    this.confirm.confirm({
      message: `¿Ejecutar orden de corte para "${orden.abonado_nombre}"? El abonado pasará a estado "Cortado".`,
      header: 'Confirmar ejecución',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, ejecutar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.service.ejecutar(orden.id!).subscribe({
          next: () => {
            this.msgs.add({
              severity: 'success',
              summary: 'Ejecutada',
              detail: 'Orden ejecutada correctamente',
            });
            this.load();
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

  eliminar(orden: OrdenCorte, e?: Event) {
    e?.stopPropagation();
    this.confirm.confirm({
      message: `¿Eliminar orden de corte #${orden.id}? Esta acción no se puede deshacer.`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.service.delete(orden.id!).subscribe({
          next: () => {
            this.msgs.add({
              severity: 'success',
              summary: 'Eliminada',
              detail: 'Orden eliminada correctamente',
            });
            this.load();
          },
          error: () => {
            this.msgs.add({
              severity: 'error',
              summary: 'Error',
              detail: 'No se pudo eliminar la orden',
            });
          },
        });
      },
    });
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
