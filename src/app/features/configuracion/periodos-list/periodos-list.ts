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
import { PeriodosService } from '../../../core/services/periodos.service';
import type { Periodo, EstadoPeriodo } from '../../../core/models';

@Component({
  selector: 'app-periodos-list',
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
  templateUrl: './periodos-list.html',
  styleUrl: './periodos-list.scss',
  providers: [MessageService, ConfirmationService],
})
export class PeriodosList implements OnInit {
  private service = inject(PeriodosService);
  private router = inject(Router);
  private msgs = inject(MessageService);
  private confirm = inject(ConfirmationService);

  data = signal<Periodo[]>([]);
  filtered = signal<Periodo[]>([]);
  cargando = signal(false);

  q = signal('');
  statusFiltro = signal<string | null>(null);
  readonly statusOptions = [
    { label: 'Todos', value: null },
    { label: 'Abierto', value: 'A' },
    { label: 'Cerrado', value: 'C' },
  ];

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
          detail: 'No se pudieron cargar los períodos',
        });
      },
    });
  }

  filtrar() {
    const q = this.q().toLowerCase();
    const st = this.statusFiltro();
    this.filtered.set(
      this.data().filter((p) => {
        const label = this.labelPeriodo(p).toLowerCase();
        const matchQ = !q || label.includes(q);
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

  labelPeriodo(p: Periodo): string {
    return `${p.periodo}-${p.anio}`;
  }

  abrirNuevo() {
    this.router.navigate(['/periodos/nuevo']);
  }

  abrirEditar(p: Periodo) {
    this.router.navigate(['/periodos', p.id, 'editar']);
  }

  eliminar(p: Periodo) {
    this.confirm.confirm({
      message: `¿Eliminar el período "${this.labelPeriodo(p)}"?`,
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
              detail: 'Período eliminado correctamente',
            });
            this.load();
          },
          error: () => {
            this.msgs.add({
              severity: 'error',
              summary: 'Error',
              detail: 'No se pudo eliminar el período',
            });
          },
        });
      },
    });
  }

  statusLabel(s: EstadoPeriodo): string {
    return s === 'A' ? 'Abierto' : 'Cerrado';
  }

  statusSeverity(s: EstadoPeriodo): 'success' | 'warn' {
    return s === 'A' ? 'success' : 'warn';
  }
}
