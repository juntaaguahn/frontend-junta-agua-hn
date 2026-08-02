import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, switchMap, tap, of } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { DatePickerModule } from 'primeng/datepicker';
import { MessageService } from 'primeng/api';
import { PagosService } from '../../../core/services/pagos.service';
import { AbonadosService } from '../../../core/services/abonados.service';
import { FacturasService } from '../../../core/services/facturas.service';
import { TodoPagoService } from '../../../core/services/todopago.service';
import { NavegacionService } from '../../../core/services/navegacion.service';
import { MetodoPago, Factura, Abonado, TransaccionPago } from '../../../core/models';

@Component({
  selector: 'app-pagos-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    TextareaModule,
    SelectModule,
    TooltipModule,
    DatePickerModule,
  ],
  templateUrl: './pagos-form.html',
  styleUrl: './pagos-form.scss',
})
export class PagosForm implements OnInit {
  private fb = inject(FormBuilder);
  private pagosSvc = inject(PagosService);
  private abonadosSvc = inject(AbonadosService);
  private facturasSvc = inject(FacturasService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private msgs = inject(MessageService);
  private tpSvc = inject(TodoPagoService);
  private nav = inject(NavegacionService);

  guardando = signal(false);
  abonados = signal<Abonado[]>([]);
  abonadoPreseleccionado = signal<Abonado | null>(null);
  facturas = signal<Factura[]>([]);
  facturaSeleccionada = signal<Factura | null>(null);
  esEfectivo = computed(() => this.form?.get('metodo')?.value === 'efectivo');

  tpEnabled = signal(true);
  tpGenerando = signal(false);
  tpLink = signal<string | null>(null);
  tpOperationId = signal<string | null>(null);
  tpStatus = signal<string | null>(null);

  tpMonto = signal(0);

  search$ = new Subject<string>();

  readonly metodoOptions: { label: string; value: MetodoPago }[] = [
    { label: 'Efectivo', value: 'efectivo' },
    { label: 'Transferencia', value: 'transferencia' },
    { label: 'Cheque', value: 'cheque' },
    { label: 'Tarjeta', value: 'tarjeta' },
  ];

  form!: FormGroup;

  ngOnInit() {
    this.form = this.fb.group({
      abonado_id: [null, Validators.required],
      factura_id: [null],
      monto: [null, [Validators.required, Validators.min(0.01)]],
      metodo: ['efectivo' as MetodoPago, Validators.required],
      efectivo_recibido: [null],
      cambio: [{ value: null, disabled: true }],
      fecha_pago: [new Date(), Validators.required],
      concepto: [''],
      comprobante: [''],
    });

    this.search$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((q) => this.abonadosSvc.list({ q, limit: 15 })),
      )
      .subscribe({
        next: (res) => this.abonados.set(res.data),
        error: () => this.abonados.set([]),
      });

    this.form
      .get('abonado_id')
      ?.valueChanges.pipe(
        tap(() => {
          this.form.patchValue({ factura_id: null, monto: null }, { emitEvent: false });
          this.facturaSeleccionada.set(null);
        }),
        switchMap((id) => {
          if (!id) return of({ data: [] as Factura[] });
          return this.facturasSvc.list({ abonado_id: id, estado: 'pendiente', limit: 50 });
        }),
      )
      .subscribe({
        next: (res) =>
          this.facturas.set(
            res.data.map((f) => ({
              ...f,
              label: `#${f.id} — ${f.periodo} — L. ${Number(f.total).toFixed(2)}`,
            })),
          ),
        error: () => this.facturas.set([]),
      });

    this.form.get('factura_id')?.valueChanges.subscribe((id) => {
      if (!id) {
        this.facturaSeleccionada.set(null);
        return;
      }
      const f = this.facturas().find((x) => x.id === id);
      this.facturaSeleccionada.set(f || null);
      if (f) this.form.patchValue({ monto: f.total - (f.total_pagado || 0) }, { emitEvent: false });
      this.seleccionarFacturaPorId(this.form.get('factura_id')?.value);
    });

    this.form.get('metodo')?.valueChanges.subscribe(() => {
      this.form.patchValue({ efectivo_recibido: null, cambio: null }, { emitEvent: false });
    });

    this.form.get('efectivo_recibido')?.valueChanges.subscribe((er) => {
      const monto = this.form.get('monto')?.value;
      const ctrl = this.form.get('efectivo_recibido');
      const errors: Record<string, string> = {};
      if (er != null) {
        if (er < 0) errors['negativo'] = 'El efectivo recibido no puede ser negativo';
        else if (monto != null && er < monto)
          errors['menor'] = 'El efectivo recibido no puede ser menor al monto';
      }
      ctrl?.setErrors(Object.keys(errors).length ? errors : null);
      if (er && monto && er >= monto && er >= 0) {
        this.form.patchValue({ cambio: Math.max(0, er - monto) }, { emitEvent: false });
      } else {
        this.form.patchValue({ cambio: null }, { emitEvent: false });
      }
    });

    this.route.queryParams.subscribe((qp) => {
      const abonadoId = qp['abonado_id'] ? Number(qp['abonado_id']) : null;
      const facturaId = qp['factura_id'] ? Number(qp['factura_id']) : null;
      if (abonadoId) {
        const nombre = qp['abonado_nombre'] || '';
        const codigo = qp['abonado_codigo'] || '';
        if (nombre) {
          this.abonadoPreseleccionado.set({ id: abonadoId, nombre, codigo } as Abonado);
          this.abonados.set([{ id: abonadoId, nombre, codigo } as Abonado]);
        } else {
          this.abonadosSvc.get(abonadoId).subscribe({
            next: (a) => {
              this.abonadoPreseleccionado.set(a);
              this.abonados.set([a]);
            },
          });
        }
        // Seteamos abonado_id sin disparar el valueChanges (para no duplicar
        // la carga de facturas) y hacemos nosotros la carga aqui mismo,
        // encadenando la seleccion de la factura solo cuando la lista ya llego.
        this.form.patchValue({ abonado_id: abonadoId }, { emitEvent: false });
        this.facturaSeleccionada.set(null);
        this.facturasSvc.list({ abonado_id: abonadoId, estado: 'pendiente', limit: 50 }).subscribe({
          next: (res) => {
            this.facturas.set(
              res.data.map((f) => ({
                ...f,
                label: `#${f.id} — ${f.periodo} — L. ${Number(f.total).toFixed(2)}`,
              })),
            );
            if (facturaId) {
              // La lista ya esta cargada, ahora si podemos seleccionar la
              // factura con la certeza de que sera encontrada.
              this.form.patchValue({ factura_id: facturaId }, { emitEvent: true });
            }
          },
          error: () => this.facturas.set([]),
        });
      } else if (facturaId) {
        // No hay abonado preseleccionado pero si factura: seteamos igual,
        // el listener de factura_id intentara resolverla contra la lista actual.
        this.form.patchValue({ factura_id: facturaId }, { emitEvent: true });
      }
    });
  }

  buscarAbonado(q: string) {
    this.search$.next(q);
  }

  guardar() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue() as Record<string, unknown>;
    const payload: Record<string, unknown> = {
      abonado_id: raw['abonado_id'],
      factura_id: raw['factura_id'],
      monto: raw['monto'],
      metodo: raw['metodo'],
      fecha_pago: (raw['fecha_pago'] instanceof Date
        ? raw['fecha_pago']
        : new Date(raw['fecha_pago'] as string)
      )
        .toISOString()
        .slice(0, 10),
      concepto: raw['concepto'],
      comprobante: raw['comprobante'],
    };
    if (raw['metodo'] === 'efectivo') {
      payload['efectivo_recibido'] = raw['efectivo_recibido'];
      payload['cambio'] = raw['cambio'];
    }

    this.guardando.set(true);
    this.pagosSvc.create(payload).subscribe({
      next: (p) => {
        this.guardando.set(false);
        this.msgs.add({
          severity: 'success',
          summary: 'Pago registrado',
          detail: `Recibo #${p.id}`,
        });
        this.router.navigate(['/pagos']);
      },
      error: () => {
        this.guardando.set(false);
        this.msgs.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo registrar el pago',
        });
      },
    });
  }

  generarLinkPago() {
    const f = this.facturaSeleccionada();
    if (!f?.id) return;
    this.tpGenerando.set(true);
    this.tpLink.set(null);
    this.tpOperationId.set(null);
    this.tpStatus.set(null);
    this.tpSvc.generarLink(f.id).subscribe({
      next: (res) => {
        this.tpGenerando.set(false);
        this.tpLink.set(res.url);
        this.tpOperationId.set(res.operationId);
        this.tpStatus.set('pending');
        this.msgs.add({
          severity: 'success',
          summary: 'Link generado',
          detail: 'Link de pago creado correctamente',
        });
        if (res.sandbox) {
          this.msgs.add({
            severity: 'info',
            summary: 'Modo simulación',
            detail: 'Configura TODOPAGO en .env para pagos reales',
          });
        }
      },
      error: (err) => {
        this.tpGenerando.set(false);
        this.msgs.add({
          severity: 'error',
          summary: 'Error',
          detail: err.error?.error || 'No se pudo generar el link',
        });
      },
    });
  }

  copiarLink() {
    const link = this.tpLink();
    if (!link) return;
    navigator.clipboard.writeText(link).then(() => {
      this.msgs.add({
        severity: 'success',
        summary: 'Copiado',
        detail: 'Link copiado al portapapeles',
      });
    });
  }

  volver() {
    this.nav.volver(['/pagos']);
  }

  invalid(ctrl: string): boolean {
    const c = this.form.get(ctrl);
    return !!c && c.invalid && (c.dirty || c.touched);
  }

  // Método que busca la factura y setea el monto en el formulario
  seleccionarFacturaPorId(id: number | null): void {
    if (!id) return;

    const f = this.facturas().find((x) => x.id === id);
    this.facturaSeleccionada.set(f || null);

    if (f) {
      this.form.patchValue({ monto: f.total - (f.total_pagado || 0) }, { emitEvent: false });
    }
  }
}
