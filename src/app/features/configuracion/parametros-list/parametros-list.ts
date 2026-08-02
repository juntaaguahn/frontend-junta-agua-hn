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
import { ParametrosService } from '../../../core/services/parametros.service';
import type { Parametro } from '../../../core/models';

@Component({
  selector: 'app-parametros-list',
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
  templateUrl: './parametros-list.html',
  styleUrl: './parametros-list.scss',
  providers: [MessageService, ConfirmationService],
})
export class ParametrosList implements OnInit {
  private service = inject(ParametrosService);
  private msgs = inject(MessageService);
  private confirm = inject(ConfirmationService);

  data = signal<Parametro[]>([]);
  filtered = signal<Parametro[]>([]);
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
  formKey = signal('');
  formValue = signal('');
  formStatus = signal<'Y' | 'N'>('Y');
  paramEditando = signal<Parametro | null>(null);
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
          detail: 'No se pudieron cargar los parámetros',
        });
      },
    });
  }

  filtrar() {
    const q = this.q().toLowerCase();
    const st = this.statusFiltro();
    this.filtered.set(
      this.data().filter((p) => {
        const matchQ =
          !q || p.key_param.toLowerCase().includes(q) || p.value_param.toLowerCase().includes(q);
        const matchSt = !st || p.status === st;
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
    this.paramEditando.set(null);
    this.formKey.set('');
    this.formValue.set('');
    this.formStatus.set('Y');
    this.dialogVisible.set(true);
  }

  abrirEditar(p: Parametro) {
    this.editando.set(true);
    this.paramEditando.set(p);
    this.formKey.set(p.key_param);
    this.formValue.set(p.value_param);
    this.formStatus.set(p.status);
    this.dialogVisible.set(true);
  }

  guardar() {
    const key = this.formKey().trim();
    const value = this.formValue().trim();
    if (!key || !value) return;

    this.guardando.set(true);
    const body = { key_param: key, value_param: value, status: this.formStatus() };
    const obs = this.editando()
      ? this.service.update(this.paramEditando()!.id!, body)
      : this.service.create(body);

    obs.subscribe({
      next: () => {
        this.guardando.set(false);
        this.dialogVisible.set(false);
        this.msgs.add({
          severity: 'success',
          summary: 'Guardado',
          detail: this.editando() ? 'Parámetro actualizado' : 'Parámetro creado correctamente',
        });
        this.load();
      },
      error: () => {
        this.guardando.set(false);
        this.msgs.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo guardar el parámetro',
        });
      },
    });
  }

  eliminar(p: Parametro) {
    this.confirm.confirm({
      message: `¿Eliminar el parámetro "${p.key_param}"?`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.service.delete(p.id!).subscribe({
          next: () => {
            this.msgs.add({
              severity: 'success',
              summary: 'Eliminado',
              detail: 'Parámetro eliminado correctamente',
            });
            this.load();
          },
          error: () => {
            this.msgs.add({
              severity: 'error',
              summary: 'Error',
              detail: 'No se pudo eliminar el parámetro',
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
