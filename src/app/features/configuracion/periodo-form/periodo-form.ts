import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { MessageService } from 'primeng/api';
import { PeriodosService } from '../../../core/services/periodos.service';
import { NavegacionService } from '../../../core/services/navegacion.service';
import type { Periodo, EstadoPeriodo } from '../../../core/models';

@Component({
  selector: 'app-periodo-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    TagModule,
  ],
  templateUrl: './periodo-form.html',
  styleUrl: './periodo-form.scss',
})
export class PeriodoForm implements OnInit {
  private fb = inject(FormBuilder);
  private service = inject(PeriodosService);
  private route = inject(ActivatedRoute);
  private msgs = inject(MessageService);
  private nav = inject(NavegacionService);

  esEdicion = signal(false);
  cargando = signal(false);
  guardando = signal(false);
  titulo = signal('Nuevo período');

  readonly statusOptions = [
    { label: 'Abierto', value: 'A' as EstadoPeriodo },
    { label: 'Cerrado', value: 'C' as EstadoPeriodo },
  ];

  form = this.fb.group({
    periodo: ['', [Validators.required, Validators.pattern(/^(0[1-9]|1[0-2])$/)]],
    anio: [String(new Date().getFullYear()), [Validators.required, Validators.pattern(/^\d{4}$/)]],
    status: ['A' as EstadoPeriodo, Validators.required],
  });

  readonly preview = computed(() => {
    const periodo = this.form.get('periodo')?.value;
    const anio = this.form.get('anio')?.value;
    const status = this.form.get('status')?.value as EstadoPeriodo;
    if (!periodo || !anio) return null;
    return { label: `${periodo}-${anio}`, status };
  });

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.esEdicion.set(true);
      this.titulo.set('Editar período');
      this.cargando.set(true);
      this.service.get(+id).subscribe({
        next: (p) => {
          this.form.patchValue({ periodo: p.periodo, anio: p.anio, status: p.status });
          this.form.get('periodo')?.disable();
          this.form.get('anio')?.disable();
          this.cargando.set(false);
        },
        error: () => {
          this.cargando.set(false);
          this.msgs.add({ severity: 'error', summary: 'Error', detail: 'Período no encontrado' });
          this.volver();
        },
      });
    }
  }

  guardar() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    this.guardando.set(true);
    const op = this.esEdicion()
      ? this.service.update(+this.route.snapshot.paramMap.get('id')!, {
          anio: raw.anio!,
          periodo: raw.periodo!,
          status: raw.status!,
        })
      : this.service.create({ anio: raw.anio!, periodo: raw.periodo!, status: raw.status! });

    op.subscribe({
      next: () => {
        this.guardando.set(false);
        this.msgs.add({
          severity: 'success',
          summary: 'Guardado',
          detail: this.esEdicion() ? 'Período actualizado' : 'Período creado correctamente',
        });
        this.volver();
      },
      error: () => {
        this.guardando.set(false);
        this.msgs.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo guardar el período',
        });
      },
    });
  }

  volver() {
    this.nav.volver(['/periodos']);
  }

  invalid(ctrl: string): boolean {
    const c = this.form.get(ctrl);
    return !!c && c.invalid && (c.dirty || c.touched);
  }

  statusLabel(s: EstadoPeriodo): string {
    return s === 'A' ? 'Abierto' : 'Cerrado';
  }

  statusSeverity(s: EstadoPeriodo): 'success' | 'warn' {
    return s === 'A' ? 'success' : 'warn';
  }
}
