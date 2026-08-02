import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DataViewModule } from 'primeng/dataview';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService, ConfirmationService } from 'primeng/api';
import { TarifasService } from '../../../core/services/tarifas.service';
import type { Tarifa } from '../../../core/models';

@Component({
  selector: 'app-tarifas-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DataViewModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    TagModule,
    TooltipModule,
  ],
  templateUrl: './tarifas-list.html',
  styleUrl: './tarifas-list.scss',
})
export class TarifasList implements OnInit {
  private service = inject(TarifasService);
  private router = inject(Router);
  private msgs = inject(MessageService);
  private confirm = inject(ConfirmationService);

  data = signal<Tarifa[]>([]);
  filtered = signal<Tarifa[]>([]);
  cargando = signal(false);

  q = signal('');

  readonly estadoOptions = [
    { label: 'Todos', value: null },
    { label: 'Activo', value: 'activo' },
    { label: 'Inactivo', value: 'inactivo' },
  ];

  estadoFiltro = signal<string | null>(null);

  ngOnInit() {
    this.load();
  }

  load() {
    this.cargando.set(true);
    this.service.list().subscribe({
      next: (res) => {
        this.data.set(res);
        this.filtrar();
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.msgs.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar las tarifas',
        });
      },
    });
  }

  filtrar() {
    const q = this.q().toLowerCase();
    const est = this.estadoFiltro();
    this.filtered.set(
      this.data().filter((t) => {
        const matchQ =
          !q ||
          t.concepto.toLowerCase().includes(q) ||
          (t.descripcion?.toLowerCase().includes(q) ?? false) ||
          (t.unidad?.toLowerCase().includes(q) ?? false);
        const matchEst = !est || t.estado === est;
        return matchQ && matchEst;
      }),
    );
  }

  buscar() {
    this.filtrar();
  }

  limpiarFiltros() {
    this.q.set('');
    this.estadoFiltro.set(null);
    this.filtrar();
  }

  ver(id?: number) {
    if (!id) return;
    this.router.navigate(['/tarifas', id]);
  }

  nuevo() {
    this.router.navigate(['/tarifas', 'nuevo']);
  }

  editar(id?: number, e?: Event) {
    e?.stopPropagation();
    if (!id) return;
    this.router.navigate(['/tarifas', id, 'editar']);
  }

  eliminar(tarifa: Tarifa, e?: Event) {
    e?.stopPropagation();
    this.confirm.confirm({
      message: `¿Eliminar la tarifa "${tarifa.concepto}"? Esta acción no se puede deshacer.`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.service.delete(tarifa.id!).subscribe({
          next: () => {
            this.msgs.add({
              severity: 'success',
              summary: 'Eliminado',
              detail: 'Tarifa eliminada correctamente',
            });
            this.load();
          },
          error: () => {
            this.msgs.add({
              severity: 'error',
              summary: 'Error',
              detail: 'No se pudo eliminar la tarifa',
            });
          },
        });
      },
    });
  }

  severityFor(estado: 'activo' | 'inactivo'): 'success' | 'danger' {
    return estado === 'activo' ? 'success' : 'danger';
  }
}
