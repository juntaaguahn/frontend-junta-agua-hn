import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { UsuariosPeriodoService } from '../../../core/services/usuarios-periodo.service';
import type { UsuarioPeriodo, EstadoPeriodo } from '../../../core/models';

@Component({
  selector: 'app-usuarios-periodo',
  standalone: true,
  imports: [
    CommonModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    TagModule,
    TooltipModule,
    ToastModule,
    ConfirmDialogModule,
  ],
  templateUrl: './usuarios-periodo.html',
  styleUrl: './usuarios-periodo.scss',
  providers: [MessageService, ConfirmationService],
})
export class UsuariosPeriodo implements OnInit {
  private service = inject(UsuariosPeriodoService);
  private router = inject(Router);
  private msgs = inject(MessageService);
  private confirm = inject(ConfirmationService);

  data = signal<UsuarioPeriodo[]>([]);
  cargando = signal(false);

  ngOnInit() {
    this.load();
  }

  load() {
    this.cargando.set(true);
    this.service.list().subscribe({
      next: (res) => {
        this.data.set(res);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.msgs.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar las asignaciones',
        });
      },
    });
  }

  nuevaAsignacion() {
    this.router.navigate(['/usuarios-periodo/nuevo']);
  }

  eliminar(up: UsuarioPeriodo) {
    this.confirm.confirm({
      message: `¿Quitar el período "${up.periodo}" a "${up.usuario_nombre}"?`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, quitar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.service.delete(up.id!).subscribe({
          next: () => {
            this.msgs.add({
              severity: 'success',
              summary: 'Eliminado',
              detail: 'Asignación eliminada correctamente',
            });
            this.load();
          },
          error: () => {
            this.msgs.add({
              severity: 'error',
              summary: 'Error',
              detail: 'No se pudo eliminar la asignación',
            });
          },
        });
      },
    });
  }

  periodoStatusLabel(s: EstadoPeriodo): string {
    return s === 'A' ? 'Abierto' : 'Cerrado';
  }

  periodoStatusSeverity(s: EstadoPeriodo): 'success' | 'warn' {
    return s === 'A' ? 'success' : 'warn';
  }
}
