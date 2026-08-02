import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { MessageService } from 'primeng/api';
import { OrdenesService } from '../../../core/services/ordenes.service';
import { AbonadosService } from '../../../core/services/abonados.service';
import { NavegacionService } from '../../../core/services/navegacion.service';
import { Abonado } from '../../../core/models';

@Component({
  selector: 'app-orden-form',
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
  templateUrl: './orden-form.html',
  styleUrl: './orden-form.scss',
})
export class OrdenForm implements OnInit {
  private fb = inject(FormBuilder);
  private service = inject(OrdenesService);
  private abonadosSvc = inject(AbonadosService);
  private msgs = inject(MessageService);
  private nav = inject(NavegacionService);

  guardando = signal(false);
  abonados = signal<Abonado[]>([]);

  form!: FormGroup;

  ngOnInit() {
    this.form = this.fb.group({
      abonado_id: [null, Validators.required],
      motivo: ['Morosidad', [Validators.maxLength(255)]],
      fecha_emision: [new Date(), Validators.required],
    });

    this.abonadosSvc.list({ limit: 500, estado: 'activo' }).subscribe({
      next: (res) => this.abonados.set(res.data),
    });
  }

  guardar() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.value;
    const payload = {
      ...raw,
      fecha_emision:
        raw.fecha_emision instanceof Date
          ? raw.fecha_emision.toISOString().slice(0, 10)
          : raw.fecha_emision,
    };

    this.guardando.set(true);
    this.service.create(payload).subscribe({
      next: () => {
        this.guardando.set(false);
        this.msgs.add({
          severity: 'success',
          summary: 'Creada',
          detail: 'Orden de corte creada correctamente',
        });
        this.volver();
      },
      error: () => {
        this.guardando.set(false);
        this.msgs.add({ severity: 'error', summary: 'Error', detail: 'No se pudo crear la orden' });
      },
    });
  }

  volver() {
    this.nav.volver(['/ordenes']);
  }

  invalid(ctrl: string): boolean {
    const c = this.form.get(ctrl);
    return !!c && c.invalid && (c.dirty || c.touched);
  }
}
