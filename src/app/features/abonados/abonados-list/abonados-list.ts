import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { InputIconModule } from 'primeng/inputicon';
import { IconFieldModule } from 'primeng/iconfield';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { AbonadosService } from '../../../core/services/abonados.service';
import { Abonado, EstadoAbonado } from '../../../core/models';

@Component({
  selector: 'app-abonados-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    TagModule,
    SkeletonModule,
    TooltipModule,
    InputIconModule,
    IconFieldModule,
    ToastModule,
    ConfirmDialogModule,
  ],
  templateUrl: './abonados-list.html',
  styleUrl: './abonados-list.scss',
  providers: [MessageService, ConfirmationService],
})
export class AbonadosList implements OnInit {
  private service = inject(AbonadosService);
  private router = inject(Router);
  private msgs = inject(MessageService);
  private confirm = inject(ConfirmationService);

  data = signal<Abonado[]>([]);
  cargando = signal(false);

  q = signal('');
  sectorFiltro = signal<string | null>(null);
  estadoFiltro = signal<string | null>(null);
  sectores = signal<string[]>([]);

  readonly estadoOptions = [
    { label: 'Todos los Abonados', value: null, icon: 'pi pi-users' },
    { label: 'Al Día', value: 'al_dia', icon: 'pi pi-check-circle' },
    { label: 'En Mora', value: 'en_mora', icon: 'pi pi-exclamation-triangle' },
    { label: 'Cortados', value: 'cortado', icon: 'pi pi-trash' },
  ];

  stats = computed(() => {
    const items = this.data();
    return {
      total: items.length,
      alDia: items.filter((a) => (a.saldo_pendiente || 0) <= 0 && a.estado === 'activo').length,
      enMora: items.filter((a) => (a.saldo_pendiente || 0) > 0).length,
      cortados: items.filter((a) => a.estado === 'cortado').length,
    };
  });

  ngOnInit() {
    this.loadSectores();
    this.load();
  }

  loadSectores() {
    this.service.sectores().subscribe({
      next: (s) => this.sectores.set(s),
      error: () => {},
    });
  }

  load(page = 1, limit = 50) {
    this.cargando.set(true);
    const estadoFiltro = this.estadoFiltro();

    let estadoBackend: string | undefined;
    if (estadoFiltro === 'cortado') {
      estadoBackend = 'cortado';
    }

    const necesitaFiltroLocal = estadoFiltro === 'al_dia' || estadoFiltro === 'en_mora';

    this.service
      .list({
        q: this.q(),
        sector: this.sectorFiltro() || undefined,
        estado: estadoBackend,
        page: 1,
        limit: necesitaFiltroLocal ? 500 : limit,
      })
      .subscribe({
        next: (res) => {
          let items = res.data;
          if (estadoFiltro === 'al_dia') {
            items = items.filter((a) => (a.saldo_pendiente || 0) <= 0);
          } else if (estadoFiltro === 'en_mora') {
            items = items.filter((a) => (a.saldo_pendiente || 0) > 0);
          }
          this.data.set(items);
          this.cargando.set(false);
        },
        error: () => {
          this.cargando.set(false);
          this.msgs.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudieron cargar los abonados',
          });
        },
      });
  }

  buscar() {
    this.load();
  }

  limpiarFiltros() {
    this.q.set('');
    this.sectorFiltro.set(null);
    this.estadoFiltro.set(null);
    this.load();
  }

  ver(id?: number) {
    if (!id) return;
    this.router.navigate(['/abonados', id]);
  }

  nuevo() {
    this.router.navigate(['/abonados', 'nuevo']);
  }

  editar(id?: number, e?: Event) {
    e?.stopPropagation();
    if (!id) return;
    this.router.navigate(['/abonados', id, 'editar']);
  }

  cobrar(abonado: Abonado, e?: Event) {
    e?.stopPropagation();
    this.router.navigate(['/pagos/nuevo'], {
      queryParams: { abonado_id: abonado.id, abonado_nombre: abonado.nombre },
    });
  }

  eliminar(abonado: Abonado, e?: Event) {
    e?.stopPropagation();
    this.confirm.confirm({
      message: `¿Eliminar al abonado "${abonado.nombre}" (${abonado.codigo})? Esta acción no se puede deshacer.`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.service.delete(abonado.id!).subscribe({
          next: () => {
            this.msgs.add({
              severity: 'success',
              summary: 'Eliminado',
              detail: 'Abonado eliminado correctamente',
            });
            this.load();
          },
          error: () => {
            this.msgs.add({
              severity: 'error',
              summary: 'Error',
              detail: 'No se pudo eliminar (puede tener facturas/pagos asociados)',
            });
          },
        });
      },
    });
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
}
