import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataViewModule } from 'primeng/dataview';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { SectoresService } from '../../../core/services/sectores.service';
import type { Sector } from '../../../core/models';

@Component({
  selector: 'app-sectores-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DataViewModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    TagModule,
    DialogModule,
    TooltipModule,
    ToastModule,
    ConfirmDialogModule,
  ],
  templateUrl: './sectores-list.html',
  styleUrl: './sectores-list.scss',
  providers: [MessageService, ConfirmationService],
})
export class SectoresList implements OnInit {
  private service = inject(SectoresService);
  private msgs = inject(MessageService);
  private confirm = inject(ConfirmationService);

  data = signal<Sector[]>([]);
  filtered = signal<Sector[]>([]);
  cargando = signal(false);

  q = signal('');

  statusFiltro = signal<string | null>(null);
  readonly statusOptions = [
    { label: 'Todos', value: null },
    { label: 'Activo', value: 'Y' },
    { label: 'Inactivo', value: 'N' },
  ];

  dialogVisible = signal(false);
  editando = signal(false);
  formDescripcion = signal('');
  sectorEditando = signal<Sector | null>(null);
  guardando = signal(false);

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
          detail: 'No se pudieron cargar los sectores',
        });
      },
    });
  }

  filtrar() {
    const q = this.q().toLowerCase();
    const st = this.statusFiltro();
    this.filtered.set(
      this.data().filter((s) => {
        const matchQ = !q || s.descripcion.toLowerCase().includes(q);
        const matchSt = !st || s.status === st;
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

  abrirNuevo() {
    this.editando.set(false);
    this.sectorEditando.set(null);
    this.formDescripcion.set('');
    this.dialogVisible.set(true);
  }

  abrirEditar(s: Sector) {
    this.editando.set(true);
    this.sectorEditando.set(s);
    this.formDescripcion.set(s.descripcion);
    this.dialogVisible.set(true);
  }

  guardar() {
    const desc = this.formDescripcion().trim();
    if (!desc) return;

    this.guardando.set(true);
    const obs = this.editando()
      ? this.service.update(this.sectorEditando()!.sectorId!, { descripcion: desc })
      : this.service.create({ descripcion: desc });

    obs.subscribe({
      next: () => {
        this.guardando.set(false);
        this.dialogVisible.set(false);
        this.msgs.add({
          severity: 'success',
          summary: 'Guardado',
          detail: this.editando() ? 'Sector actualizado' : 'Sector creado correctamente',
        });
        this.load();
      },
      error: () => {
        this.guardando.set(false);
        this.msgs.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo guardar el sector',
        });
      },
    });
  }

  eliminar(s: Sector) {
    this.confirm.confirm({
      message: `¿Eliminar el sector "${s.descripcion}"?`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.service.delete(s.sectorId!).subscribe({
          next: () => {
            this.msgs.add({
              severity: 'success',
              summary: 'Eliminado',
              detail: 'Sector eliminado correctamente',
            });
            this.load();
          },
          error: () => {
            this.msgs.add({
              severity: 'error',
              summary: 'Error',
              detail: 'No se pudo eliminar el sector',
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
