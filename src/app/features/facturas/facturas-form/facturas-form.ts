import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';
import { FacturasService } from '../../../core/services/facturas.service';
import { AbonadosService } from '../../../core/services/abonados.service';
import { LecturasService } from '../../../core/services/lecturas.service';
import { TarifasService } from '../../../core/services/tarifas.service';
import { NavegacionService } from '../../../core/services/navegacion.service';
import { Abonado, Lectura } from '../../../core/models';

@Component({
  selector: 'app-facturas-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    TextareaModule,
    SelectModule,
    DatePickerModule,
    DialogModule,
  ],
  templateUrl: './facturas-form.html',
  styleUrl: './facturas-form.scss',
})
export class FacturasForm implements OnInit {
  private fb = inject(FormBuilder);
  private service = inject(FacturasService);
  private abonadosSvc = inject(AbonadosService);
  private lecturasSvc = inject(LecturasService);
  private tarifasSvc = inject(TarifasService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private msgs = inject(MessageService);
  private nav = inject(NavegacionService);

  esEdicion = signal(false);
  cargando = signal(false);
  guardando = signal(false);
  titulo = signal('Nueva factura');
  showImprimirDialog = signal(false);
  facturaIdGuardada: number | null = null;

  abonados = signal<Abonado[]>([]);
  lecturaEncontrada = signal<Lectura | null>(null);
  buscandoLectura = signal(false);

  readonly estadoOptions = [
    { label: 'Pendiente', value: 'pendiente' },
    { label: 'Pagada', value: 'pagada' },
    { label: 'Vencida', value: 'vencida' },
    { label: 'Anulada', value: 'anulada' },
  ];

  form!: FormGroup;

  ngOnInit() {
    this.form = this.fb.group({
      abonado_id: [null, Validators.required],
      periodo: [
        this.mesActual(),
        [Validators.required, Validators.pattern(/^\d{4}-(0[1-9]|1[0-2])$/)],
      ],
      consumo_m3: [0, [Validators.required, Validators.min(0)]],
      subtotal_agua: [0, [Validators.required, Validators.min(0)]],
      excedente: [0, [Validators.min(0)]],
      alcantarillado: [0, [Validators.min(0)]],
      mora: [0, [Validators.min(0)]],
      multas: [0, [Validators.min(0)]],
      total: [{ value: 0, disabled: true }],
      estado: [{ value: 'pendiente', disabled: true }, Validators.required],
      fecha_emision: [{ value: new Date(), disabled: true }, Validators.required],
      fecha_vencimiento: [{ value: this.dentroDe15Dias(), disabled: true }, Validators.required],
    });

    this.cargarAbonados();

    this.form.valueChanges.subscribe(() => this.recalcularTotal());

    this.form.get('abonado_id')?.valueChanges.subscribe(() => this.buscarLectura());
    this.form.get('periodo')?.valueChanges.subscribe(() => this.buscarLectura());

    const qp = this.route.snapshot.queryParamMap;
    const abonadoId = qp.get('abonado_id');
    const periodo = qp.get('periodo');
    const consumo = qp.get('consumo_m3');

    if (abonadoId && periodo && consumo) {
      this.form.patchValue({
        abonado_id: +abonadoId,
        periodo,
        consumo_m3: +consumo,
      });
      this.buscarLectura();
      if (+consumo > 0) this.calcularDesdeTarifas(+consumo);
    } else {
      this.buscarLectura();
    }

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.esEdicion.set(true);
      this.titulo.set('Editar factura');
      this.cargando.set(true);
      this.service.get(+id).subscribe({
        next: (f) => {
          this.form.patchValue({
            abonado_id: f.abonado_id,
            periodo: f.periodo,
            consumo_m3: f.consumo_m3,
            subtotal_agua: f.subtotal_agua,
            excedente: f.excedente,
            alcantarillado: f.alcantarillado,
            mora: f.mora,
            multas: f.multas,
            estado: f.estado,
            fecha_emision: new Date(f.fecha_emision),
            fecha_vencimiento: new Date(f.fecha_vencimiento),
          });
          this.form.get('abonado_id')?.disable();
          this.cargando.set(false);
        },
        error: () => {
          this.cargando.set(false);
          this.msgs.add({ severity: 'error', summary: 'Error', detail: 'Factura no encontrada' });
          this.volver();
        },
      });
    }
  }

  buscarLectura() {
    const abonadoId = this.form.get('abonado_id')?.value;
    const periodo = this.form.get('periodo')?.value;
    if (!abonadoId || !periodo || !/^\d{4}-(0[1-9]|1[0-2])$/.test(periodo)) {
      this.lecturaEncontrada.set(null);
      return;
    }
    this.buscandoLectura.set(true);
    this.lecturasSvc.list({ abonado_id: abonadoId, periodo, limit: 1 }).subscribe({
      next: (res) => {
        const lectura = res.data[0] || null;
        this.lecturaEncontrada.set(lectura);
        if (lectura) {
          this.form.get('consumo_m3')?.setValue(lectura.consumo_m3, { emitEvent: false });
          this.calcularDesdeTarifas(lectura.consumo_m3);
        }
        this.buscandoLectura.set(false);
      },
      error: () => {
        this.lecturaEncontrada.set(null);
        this.buscandoLectura.set(false);
      },
    });
  }

  private calcularDesdeTarifas(consumo: number) {
    this.tarifasSvc.list().subscribe({
      next: (tarifas) => {
        const activas = tarifas.filter((t) => t.estado === 'activo');
        let subtotal = 0;
        let excedente = 0;
        let alcantarillado = 0;

        for (const t of activas) {
          if (t.unidad === 'm3') {
            subtotal += consumo * t.valor;
          } else if (t.unidad === 'excedente') {
            excedente += t.valor;
          } else if (t.unidad === 'alcantarillado') {
            alcantarillado += t.valor;
          } else if (!t.unidad || t.unidad === 'unidad') {
            subtotal += t.valor;
          }
        }

        this.form.get('subtotal_agua')?.setValue(subtotal, { emitEvent: false });
        this.form.get('excedente')?.setValue(excedente, { emitEvent: false });
        this.form.get('alcantarillado')?.setValue(alcantarillado, { emitEvent: false });
        this.recalcularTotal();
      },
    });
  }

  cargarAbonados() {
    this.abonadosSvc.list({ limit: 500 }).subscribe({
      next: (res) => this.abonados.set(res.data),
    });
  }

  recalcularTotal() {
    const raw = this.form.getRawValue();
    const total =
      (raw.subtotal_agua || 0) +
      (raw.excedente || 0) +
      (raw.alcantarillado || 0) +
      (raw.mora || 0) +
      (raw.multas || 0);
    this.form.get('total')?.setValue(total, { emitEvent: false });
  }

  guardar() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const lectura = this.lecturaEncontrada();
    const payload: any = {
      abonado_id: raw.abonado_id,
      periodo: raw.periodo,
      lectura_id: lectura?.id || null,
      consumo_m3: raw.consumo_m3,
      subtotal_agua: raw.subtotal_agua,
      excedente: raw.excedente,
      alcantarillado: raw.alcantarillado,
      mora: raw.mora,
      multas: raw.multas,
      total:
        (raw.subtotal_agua || 0) +
        (raw.excedente || 0) +
        (raw.alcantarillado || 0) +
        (raw.mora || 0) +
        (raw.multas || 0),
      estado: raw.estado,
      fecha_emision: this.formatFecha(raw.fecha_emision),
      fecha_vencimiento: this.formatFecha(raw.fecha_vencimiento),
    };

    this.guardando.set(true);
    const op = this.esEdicion()
      ? this.service.update(+this.route.snapshot.paramMap.get('id')!, payload)
      : this.service.create(payload);

    op.subscribe({
      next: (res) => {
        this.guardando.set(false);
        this.facturaIdGuardada = res?.id || null;
        this.msgs.add({
          severity: 'success',
          summary: 'Guardado',
          detail: this.esEdicion() ? 'Factura actualizada' : 'Factura creada correctamente',
        });
        if (this.esEdicion()) {
          this.volver();
          return;
        }
        this.router.navigate(['/facturas', res.id], { queryParams: { imprimir: '1' } });
      },
      error: () => {
        this.guardando.set(false);
        this.msgs.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo guardar la factura',
        });
      },
    });
  }

  volver() {
    this.nav.volver(['/facturas']);
  }

  imprimirSi() {
    this.showImprimirDialog.set(false);
    setTimeout(() => window.print(), 200);
  }

  noImprimir() {
    this.showImprimirDialog.set(false);
    this.volver();
  }

  invalid(ctrl: string): boolean {
    const c = this.form.get(ctrl);
    return !!c && c.invalid && (c.dirty || c.touched);
  }

  private dentroDe15Dias(): Date {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d;
  }

  private mesActual(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  private formatFecha(f: Date | null): string {
    if (!f) return new Date().toISOString().slice(0, 10);
    const d = f instanceof Date ? f : new Date(f);
    return d.toISOString().slice(0, 10);
  }
}
