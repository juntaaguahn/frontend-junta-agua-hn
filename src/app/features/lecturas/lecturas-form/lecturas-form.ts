import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { MessageService } from 'primeng/api';
import { LecturasService } from '../../../core/services/lecturas.service';
import { AbonadosService } from '../../../core/services/abonados.service';
import { NavegacionService } from '../../../core/services/navegacion.service';
import { PeriodoService } from '../../../core/services/periodo.service';
import { Abonado } from '../../../core/models';

@Component({
  selector: 'app-lecturas-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    SelectModule,
    DatePickerModule,
  ],
  templateUrl: './lecturas-form.html',
  styleUrl: './lecturas-form.scss',
})
export class LecturasForm implements OnInit {
  private fb = inject(FormBuilder);
  private service = inject(LecturasService);
  private abonadosSvc = inject(AbonadosService);
  private route = inject(ActivatedRoute);
  private nav = inject(NavegacionService);
  private msgs = inject(MessageService);
  readonly periodoSvc = inject(PeriodoService);

  esEdicion = signal(false);
  cargando = signal(false);
  guardando = signal(false);
  titulo = signal('Nueva lectura');

  selectSize: 'small' | 'large' = 'small';

  abonados = signal<Abonado[]>([]);
  lecturaAnterior = signal<number | null>(null);

  form!: FormGroup;

  ngOnInit() {
    this.form = this.fb.group({
      abonado_id: [null, Validators.required],
      periodo: ['', [Validators.required, Validators.pattern(/^\d{4}-(0[1-9]|1[0-2])$/)]],
      lectura_actual: [null, [Validators.required, Validators.min(0)]],
      fecha_lectura: [new Date(), Validators.required],
      observacion: ['', Validators.maxLength(255)],
    });

    this.cargarAbonados();

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.esEdicion.set(true);
      this.titulo.set('Editar lectura');
      this.cargando.set(true);
      this.service.get(+id).subscribe({
        next: (l) => {
          this.form.patchValue({
            abonado_id: l.abonado_id,
            periodo: l.periodo,
            lectura_actual: l.lectura_actual,
            fecha_lectura: new Date(l.fecha_lectura),
            observacion: l.observacion,
          });
          this.lecturaAnterior.set(l.lectura_anterior);
          this.form.get('abonado_id')?.disable();
          this.cargando.set(false);
        },
        error: () => {
          this.cargando.set(false);
          this.msgs.add({ severity: 'error', summary: 'Error', detail: 'Lectura no encontrada' });
          this.volver();
        },
      });
    } else if (this.periodoSvc.periodoLectura()) {
      // Prellenar con el período asignado al usuario logueado
      this.form.patchValue({ periodo: this.periodoSvc.periodoLectura() });
    }
  }

  cargarAbonados() {
    this.abonadosSvc.list({ limit: 500 }).subscribe({
      next: (res) => this.abonados.set(res.data),
    });
  }

  onAbonadoChange() {
    const id = this.form.get('abonado_id')?.value;
    if (!id) {
      this.lecturaAnterior.set(null);
      return;
    }
    this.service.list({ abonado_id: id, limit: 1 }).subscribe({
      next: (res) => {
        const ultima = res.data[0];
        this.lecturaAnterior.set(ultima ? ultima.lectura_actual : 0);
      },
    });
  }

  guardar() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const anterior = this.lecturaAnterior() ?? 0;
    if (anterior >= raw.lectura_actual) {
      this.msgs.add({
        severity: 'error',
        summary: 'Error',
        detail: 'La lectura actual debe ser mayor a la lectura anterior',
      });
      return;
    }

    const payload = {
      ...raw,
      abonado_id: this.esEdicion() ? undefined : raw.abonado_id,
      fecha_lectura: this.formatFecha(raw.fecha_lectura),
    };

    this.guardando.set(true);
    const op = this.esEdicion()
      ? this.service.update(+this.route.snapshot.paramMap.get('id')!, {
          periodo: payload.periodo,
          lectura_actual: payload.lectura_actual,
          fecha_lectura: payload.fecha_lectura,
          observacion: payload.observacion,
        })
      : this.service.create({
          abonado_id: payload.abonado_id,
          periodo: payload.periodo,
          lectura_actual: payload.lectura_actual,
          fecha_lectura: payload.fecha_lectura,
          observacion: payload.observacion,
        });

    op.subscribe({
      next: () => {
        this.guardando.set(false);
        this.msgs.add({
          severity: 'success',
          summary: 'Guardado',
          detail: this.esEdicion() ? 'Lectura actualizada' : 'Lectura creada correctamente',
        });
        this.volver();
      },
      error: (err) => {
        this.guardando.set(false);
        const msg =
          err.status === 409
            ? 'Ya existe una lectura para ese abonado en el período'
            : 'No se pudo guardar la lectura';
        this.msgs.add({ severity: 'error', summary: 'Error', detail: msg });
      },
    });
  }

  volver() {
    this.nav.volver(['/lecturas']);
  }

  invalid(ctrl: string): boolean {
    const c = this.form.get(ctrl);
    return !!c && c.invalid && (c.dirty || c.touched);
  }

  private formatFecha(f: Date | null): string {
    if (!f) return new Date().toISOString().slice(0, 10);
    const d = f instanceof Date ? f : new Date(f);
    return d.toISOString().slice(0, 10);
  }
}
