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
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { TegresosService } from '../../../core/services/tegresos.service';
import type { Tegreso } from '../../../core/models';

@Component({
  selector: 'app-tegresos-list',
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
    ToastModule,
    ConfirmDialogModule,
  ],
  templateUrl: './tegresos-list.html',
  styleUrl: './tegresos-list.scss',
  providers: [MessageService, ConfirmationService],
})
export class TegresosList implements OnInit {
  private service = inject(TegresosService);
  private router = inject(Router);
  private msgs = inject(MessageService);
  private confirm = inject(ConfirmationService);

  data = signal<Tegreso[]>([]);
  filtered = signal<Tegreso[]>([]);
  cargando = signal(false);

  q = signal('');

  readonly statusOptions = [
    { label: 'Todos', value: null },
    { label: 'Activo', value: 'Y' },
    { label: 'Inactivo', value: 'N' },
  ];

  statusFiltro = signal<string | null>(null);

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
          detail: 'No se pudieron cargar los tipos de egreso',
        });
      },
    });
  }

  filtrar() {
    const q = this.q().toLowerCase();
    const st = this.statusFiltro();
    this.filtered.set(
      this.data().filter((t) => {
        const matchQ = !q || t.descripcion.toLowerCase().includes(q);
        const matchSt = !st || t.status === st;
        return matchQ && matchSt;
      }),
    );
  }

  buscar() {
    this.filtrar();
  }

  limpiarFiltros() {
    this.q.set('');
    this.statusFiltro.set(null);
    this.filtrar();
  }

  ver(id?: number) {
    if (!id) return;
    this.router.navigate(['/tegresos', id]);
  }

  nuevo() {
    this.router.navigate(['/tegresos', 'nuevo']);
  }

  editar(id?: number, e?: Event) {
    e?.stopPropagation();
    if (!id) return;
    this.router.navigate(['/tegresos', id, 'editar']);
  }

  eliminar(teg: Tegreso, e?: Event) {
    e?.stopPropagation();
    this.confirm.confirm({
      message: `¿Eliminar el tipo de egreso "${teg.descripcion}"? Esta acción no se puede deshacer.`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.service.delete(teg.egresoId!).subscribe({
          next: () => {
            this.msgs.add({
              severity: 'success',
              summary: 'Eliminado',
              detail: 'Tipo de egreso eliminado correctamente',
            });
            this.load();
          },
          error: () => {
            this.msgs.add({
              severity: 'error',
              summary: 'Error',
              detail: 'No se pudo eliminar el tipo de egreso',
            });
          },
        });
      },
    });
  }

  statusLabel(s: 'Y' | 'N'): string {
    return s === 'Y' ? 'Activo' : 'Inactivo';
  }

  statusSeverity(s: 'Y' | 'N'): 'success' | 'danger' {
    return s === 'Y' ? 'success' : 'danger';
  }
}
