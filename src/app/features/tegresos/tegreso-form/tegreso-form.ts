import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { MessageService } from 'primeng/api';
import { TegresosService } from '../../../core/services/tegresos.service';
import { NavegacionService } from '../../../core/services/navegacion.service';

@Component({
  selector: 'app-tegreso-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonModule, InputTextModule, SelectModule],
  templateUrl: './tegreso-form.html',
  styleUrl: './tegreso-form.scss',
})
export class TegresoForm implements OnInit {
  private fb = inject(FormBuilder);
  private service = inject(TegresosService);
  private route = inject(ActivatedRoute);
  private msgs = inject(MessageService);
  private nav = inject(NavegacionService);

  esEdicion = signal(false);
  cargando = signal(false);
  guardando = signal(false);
  titulo = signal('Nuevo tipo de egreso');

  readonly statusOptions = [
    { label: 'Activo', value: 'Y' },
    { label: 'Inactivo', value: 'N' },
  ];

  form!: FormGroup;

  ngOnInit() {
    this.form = this.fb.group({
      descripcion: ['', [Validators.required, Validators.maxLength(50)]],
      status: ['Y', Validators.required],
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.esEdicion.set(true);
      this.titulo.set('Editar tipo de egreso');
      this.cargando.set(true);
      this.service.get(+id).subscribe({
        next: (t) => {
          this.form.patchValue(t);
          this.cargando.set(false);
        },
        error: () => {
          this.cargando.set(false);
          this.msgs.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Tipo de egreso no encontrado',
          });
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
      ? this.service.update(+this.route.snapshot.paramMap.get('id')!, this.form.value)
      : this.service.create(this.form.value);

    op.subscribe({
      next: () => {
        this.guardando.set(false);
        this.msgs.add({
          severity: 'success',
          summary: 'Guardado',
          detail: this.esEdicion()
            ? 'Tipo de egreso actualizado'
            : 'Tipo de egreso creado correctamente',
        });
        this.volver();
      },
      error: () => {
        this.guardando.set(false);
        this.msgs.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo guardar el tipo de egreso',
        });
      },
    });
  }

  volver() {
    this.nav.volver(['/tegresos']);
  }

  invalid(ctrl: string): boolean {
    const c = this.form.get(ctrl);
    return !!c && c.invalid && (c.dirty || c.touched);
  }
}
