import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { MessageService } from 'primeng/api';
import { TarifasService } from '../../../core/services/tarifas.service';
import { NavegacionService } from '../../../core/services/navegacion.service';

@Component({
  selector: 'app-tarifa-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    TextareaModule,
    SelectModule,
  ],
  templateUrl: './tarifa-form.html',
  styleUrl: './tarifa-form.scss',
})
export class TarifaForm implements OnInit {
  private fb = inject(FormBuilder);
  private service = inject(TarifasService);
  private route = inject(ActivatedRoute);
  private msgs = inject(MessageService);
  private nav = inject(NavegacionService);

  esEdicion = signal(false);
  cargando = signal(false);
  guardando = signal(false);
  titulo = signal('Nueva tarifa');

  readonly estadoOptions = [
    { label: 'Activo', value: 'activo' },
    { label: 'Inactivo', value: 'inactivo' },
  ];

  form = this.fb.group({
    concepto: ['', [Validators.required, Validators.maxLength(40)]],
    descripcion: ['', [Validators.maxLength(120)]],
    valor: [0, [Validators.required, Validators.min(0.01)]],
    unidad: ['', [Validators.maxLength(20)]],
    estado: ['activo', Validators.required],
  });

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.esEdicion.set(true);
      this.titulo.set('Editar tarifa');
      this.cargando.set(true);
      this.service.get(+id).subscribe({
        next: (t) => {
          this.form.patchValue(t);
          this.cargando.set(false);
        },
        error: () => {
          this.cargando.set(false);
          this.msgs.add({ severity: 'error', summary: 'Error', detail: 'Tarifa no encontrada' });
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

    this.guardando.set(true);
    const op = this.esEdicion()
      ? this.service.update(+this.route.snapshot.paramMap.get('id')!, this.form.value as any)
      : this.service.create(this.form.value as any);

    op.subscribe({
      next: () => {
        this.guardando.set(false);
        this.msgs.add({
          severity: 'success',
          summary: 'Guardado',
          detail: this.esEdicion() ? 'Tarifa actualizada' : 'Tarifa creada correctamente',
        });
        this.volver();
      },
      error: () => {
        this.guardando.set(false);
        this.msgs.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo guardar la tarifa',
        });
      },
    });
  }

  volver() {
    this.nav.volver(['/tarifas']);
  }

  invalid(ctrl: string): boolean {
    const c = this.form.get(ctrl);
    return !!c && c.invalid && (c.dirty || c.touched);
  }
}
