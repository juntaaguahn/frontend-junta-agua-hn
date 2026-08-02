import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { SkeletonModule } from 'primeng/skeleton';
import { MessageService } from 'primeng/api';
import { UsuariosPeriodoService } from '../../../core/services/usuarios-periodo.service';
import { UsuariosService } from '../../../core/services/usuarios.service';
import { PeriodosService } from '../../../core/services/periodos.service';
import { NavegacionService } from '../../../core/services/navegacion.service';
import type { Usuario, Periodo, EstadoPeriodo } from '../../../core/models';

@Component({
  selector: 'app-usuarios-periodo-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    SelectModule,
    TagModule,
    SkeletonModule,
  ],
  templateUrl: './usuarios-periodo-form.html',
  styleUrl: './usuarios-periodo-form.scss',
})
export class UsuariosPeriodoForm implements OnInit {
  private fb = inject(FormBuilder);
  private service = inject(UsuariosPeriodoService);
  private usuariosService = inject(UsuariosService);
  private periodosService = inject(PeriodosService);
  private msgs = inject(MessageService);
  private nav = inject(NavegacionService);

  usuarios = signal<Usuario[]>([]);
  periodos = signal<Periodo[]>([]);
  cargandoUsuarios = signal(true);
  cargandoPeriodos = signal(true);
  guardando = signal(false);

  readonly rolSeverity: Record<string, 'info' | 'warn' | 'success' | 'secondary'> = {
    admin: 'warn',
    cajero: 'info',
    lecturador: 'success',
  };

  form = this.fb.group({
    usuarioId: [<number | null>null, Validators.required],
    periodoId: [<number | null>null, Validators.required],
  });

  usuarioSeleccionado = signal<Usuario | null>(null);
  periodoSeleccionado = signal<Periodo | null>(null);

  readonly periodoOptions = computed(() =>
    this.periodos().map((p) => ({ ...p, label: this.labelPeriodo(p) })),
  );

  readonly puedeGuardar = computed(
    () => !!this.usuarioSeleccionado() && !!this.periodoSeleccionado() && !this.guardando(),
  );

  ngOnInit() {
    this.form.valueChanges.subscribe((v) => this.sincronizarSeleccion(v));
    this.cargarUsuarios();
    this.cargarPeriodos();
  }

  private sincronizarSeleccion(v: { usuarioId?: number | null; periodoId?: number | null }): void {
    this.usuarioSeleccionado.set(this.usuarios().find((u) => u.id === v.usuarioId) ?? null);
    this.periodoSeleccionado.set(this.periodos().find((p) => p.id === v.periodoId) ?? null);
  }

  cargarUsuarios() {
    this.cargandoUsuarios.set(true);
    this.usuariosService.list().subscribe({
      next: (res) => {
        this.usuarios.set(res);
        this.cargandoUsuarios.set(false);
        this.sincronizarSeleccion(this.form.value);
      },
      error: () => {
        this.cargandoUsuarios.set(false);
        this.msgs.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar los usuarios',
        });
      },
    });
  }

  cargarPeriodos() {
    this.cargandoPeriodos.set(true);
    this.periodosService.list().subscribe({
      next: (res) => {
        this.periodos.set(res);
        this.cargandoPeriodos.set(false);
        this.sincronizarSeleccion(this.form.value);
      },
      error: () => {
        this.cargandoPeriodos.set(false);
        this.msgs.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar los períodos',
        });
      },
    });
  }

  labelPeriodo(p: Periodo): string {
    return `${p.periodo}-${p.anio}`;
  }

  periodoStatusLabel(s: EstadoPeriodo): string {
    return s === 'A' ? 'Abierto' : 'Cerrado';
  }

  periodoStatusSeverity(s: EstadoPeriodo): 'success' | 'warn' {
    return s === 'A' ? 'success' : 'warn';
  }

  guardar() {
    if (this.form.invalid || this.guardando()) return;

    this.guardando.set(true);
    this.service
      .create({ usuarioId: this.form.value.usuarioId!, periodoId: this.form.value.periodoId! })
      .subscribe({
        next: () => {
          this.guardando.set(false);
          this.msgs.add({
            severity: 'success',
            summary: 'Asignado',
            detail: 'Período asignado al usuario correctamente',
          });
          this.volver();
        },
        error: () => {
          this.guardando.set(false);
          this.msgs.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo asignar el período',
          });
        },
      });
  }

  volver() {
    this.nav.volver(['/usuarios-periodo']);
  }
}
