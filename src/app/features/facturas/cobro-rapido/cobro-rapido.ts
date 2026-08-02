import {
  Component,
  inject,
  signal,
  computed,
  ElementRef,
  ChangeDetectorRef,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { PagosService } from '../../../core/services/pagos.service';
import { FacturasService } from '../../../core/services/facturas.service';
import { TodoPagoService } from '../../../core/services/todopago.service';
import { NavegacionService } from '../../../core/services/navegacion.service';
import { Factura, EstadoFactura, MetodoPago, TransaccionPago } from '../../../core/models';

@Component({
  selector: 'app-cobro-rapido',
  standalone: true,
  imports: [
    CommonModule,
    DecimalPipe,
    ReactiveFormsModule,
    FormsModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    SelectModule,
    DatePickerModule,
    DialogModule,
    TagModule,
    TableModule,
    SkeletonModule,
    TooltipModule,
  ],
  templateUrl: './cobro-rapido.html',
  styleUrl: './cobro-rapido.scss',
})
export class CobroRapido implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private facturasSvc = inject(FacturasService);
  private pagosSvc = inject(PagosService);
  private tpSvc = inject(TodoPagoService);
  private msgs = inject(MessageService);
  private nav = inject(NavegacionService);
  private cdr = inject(ChangeDetectorRef);
  private el = inject(ElementRef);

  cargando = signal(true);
  guardando = signal(false);
  factura = signal<Factura | null>(null);

  esEfectivo = computed(() => this.form?.get('metodo')?.value === 'efectivo');
  saldo = computed(() => {
    const f = this.factura();
    if (!f) return 0;
    return Number(f.total) - Number(f.total_pagado || 0);
  });

  showCorreoDialog = signal(false);
  showImprimirDialog = signal(false);
  correoDestino = signal('');
  enviando = signal(false);

  tpGenerando = signal(false);
  tpLink = signal<string | null>(null);
  tpOperationId = signal<string | null>(null);
  tpStatus = signal<string | null>(null);
  transacciones = signal<TransaccionPago[]>([]);
  private statusInterval: ReturnType<typeof setInterval> | null = null;

  form!: FormGroup;

  readonly metodoOptions: { label: string; value: MetodoPago }[] = [
    { label: 'Efectivo', value: 'efectivo' },
    { label: 'Transferencia', value: 'transferencia' },
    { label: 'Cheque', value: 'cheque' },
    { label: 'Tarjeta', value: 'tarjeta' },
  ];

  ngOnInit() {
    this.form = this.fb.group({
      monto: [null, [Validators.required, Validators.min(0.01)]],
      metodo: ['efectivo' as MetodoPago, Validators.required],
      efectivo_recibido: [null],
      cambio: [{ value: null, disabled: true }],
      fecha_pago: [new Date(), Validators.required],
      concepto: [''],
      comprobante: [''],
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

    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.cargarFactura(+id);
  }

  cargarFactura(id: number) {
    this.facturasSvc.get(id).subscribe({
      next: (f) => {
        this.factura.set(f);
        document.title = `Cobrar factura #${f.id} - ${f.abonado_nombre || ''}`;
        this.correoDestino.set(f.abonado_email || '');
        this.form.patchValue(
          { monto: Math.max(0, Number(f.total) - Number(f.total_pagado || 0)) },
          { emitEvent: false },
        );
        this.cargando.set(false);
        this.cargarTransacciones(f.id!);
      },
      error: () => {
        this.cargando.set(false);
        this.msgs.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo cargar la factura',
        });
      },
    });
  }

  guardar() {
    const f = this.factura();
    if (!f?.id) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue() as Record<string, unknown>;
    const payload: Record<string, unknown> = {
      abonado_id: f.abonado_id,
      factura_id: f.id,
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
        this.cargarFactura(f.id!);
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
    const f = this.factura();
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
        this.cargarTransacciones(f.id!);
        this.statusInterval = setInterval(() => this.verificarStatus(res.operationId), 10000);
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

  verificarStatus(operationId: string) {
    this.tpSvc.consultarStatus(operationId).subscribe({
      next: (res) => {
        this.tpStatus.set(res.status);
        if (res.status === 'completed') {
          if (this.statusInterval) clearInterval(this.statusInterval);
          this.statusInterval = null;
          this.factura.set({ ...this.factura()!, estado: 'pagada' });
          this.msgs.add({
            severity: 'success',
            summary: 'Pago confirmado',
            detail: `La factura #${res.factura_id} ha sido pagada`,
          });
        } else if (res.status === 'failed' || res.status === 'expired') {
          if (this.statusInterval) clearInterval(this.statusInterval);
          this.statusInterval = null;
          this.msgs.add({
            severity: 'warn',
            summary: 'Pago no completado',
            detail: `Estado: ${res.status}`,
          });
        }
      },
      error: () => {},
    });
  }

  copiarLink() {
    const link = this.tpLink();
    if (!link) return;
    navigator.clipboard.writeText(link).then(() => {
      this.msgs.add({
        severity: 'info',
        summary: 'Copiado',
        detail: 'Link copiado al portapapeles',
      });
    });
  }

  cargarTransacciones(facturaId: number) {
    this.tpSvc.listarTransacciones(facturaId).subscribe({
      next: (res) => this.transacciones.set(res),
      error: () => {},
    });
  }

  editar() {
    const id = this.factura()?.id;
    if (id) this.router.navigate(['/facturas', id, 'editar']);
  }

  volver() {
    this.nav.volver(['/facturas']);
  }

  imprimir() {
    window.print();
  }

  imprimirSi() {
    this.showImprimirDialog.set(false);
    this.cdr.detectChanges();
    setTimeout(() => {
      const ticket = this.el.nativeElement.querySelector('.ticket-print');
      if (!ticket) return;
      const win = window.open('', '', 'width=400,height=600');
      if (!win) return;
      win.document.write(`
        <html>
        <head>
          <title>${document.title}</title>
          <style>
            @page { margin: 0; }
            body { margin: 0; padding: 3mm; font-family: 'Courier New', monospace; font-size: 9pt; color: #000; line-height: 1.25; }
            .ticket { max-width: 80mm; margin: 0 auto; }
            .ticket-header { text-align: center; margin-bottom: 2mm; }
            .ticket-title { font-size: 14pt; font-weight: 700; letter-spacing: 1px; }
            .ticket-sub { font-size: 8pt; color: #333; }
            .ticket-factura { font-size: 11pt; font-weight: 700; margin: 1mm 0; }
            .ticket-divider { font-size: 9pt; letter-spacing: 1px; color: #555; white-space: pre; }
            .ticket-body { margin: 2mm 0; }
            .ticket-row { display: flex; justify-content: space-between; padding: 0.5mm 0; font-size: 9pt; }
            .ticket-row .tr { text-align: right; }
            .ticket-total { font-weight: 700; font-size: 11pt; padding: 1mm 0; }
            .ticket-saldo { font-weight: 700; font-size: 10pt; color: #d00; }
            .ticket-footer { text-align: center; margin-top: 2mm; }
            .ticket-gracia { font-size: 10pt; font-weight: 700; margin: 1mm 0; }
            .ticket-legales { font-size: 7pt; color: #666; margin-top: 1mm; }
            @media print { body { margin: 0; padding: 0; } }
          </style>
        </head>
        <body>${ticket.outerHTML}</body>
        </html>
      `);
      win.document.close();
      win.focus();
      setTimeout(() => {
        win.print();
        win.close();
      }, 300);
    }, 300);
  }

  noImprimir() {
    this.showImprimirDialog.set(false);
  }

  compartir() {
    const f = this.factura();
    if (!f?.id) return;
    this.facturasSvc.downloadPDF(f.id).subscribe({
      next: (blob) => {
        const file = new File([blob], `factura-${f.id}.pdf`, { type: 'application/pdf' });
        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          navigator
            .share({
              files: [file],
              title: `Factura #${f.id}`,
              text: `Factura #${f.id} — Período ${f.periodo} — Total: L ${f.total}`,
            })
            .catch(() => {});
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `factura-${f.id}.pdf`;
          a.click();
          URL.revokeObjectURL(url);
          this.msgs.add({
            severity: 'info',
            summary: 'PDF descargado',
            detail: 'Ahora puedes compartirlo por WhatsApp',
          });
        }
      },
      error: () =>
        this.msgs.add({ severity: 'error', summary: 'Error', detail: 'No se pudo generar el PDF' }),
    });
  }

  abrirCorreo() {
    const f = this.factura();
    this.correoDestino.set(f?.abonado_email || '');
    this.showCorreoDialog.set(true);
  }

  enviarCorreo() {
    const id = this.factura()?.id;
    if (!id || !this.correoDestino()) return;
    this.enviando.set(true);
    this.facturasSvc.enviarCorreo(id, this.correoDestino()).subscribe({
      next: (res) => {
        this.enviando.set(false);
        this.showCorreoDialog.set(false);
        this.msgs.add({ severity: 'success', summary: 'Enviado', detail: res.mensaje });
      },
      error: (err) => {
        this.enviando.set(false);
        const msg = err.error?.error || 'No se pudo enviar el correo';
        this.msgs.add({ severity: 'error', summary: 'Error', detail: msg });
      },
    });
  }

  invalid(ctrl: string): boolean {
    const c = this.form.get(ctrl);
    return !!c && c.invalid && (c.dirty || c.touched);
  }

  ngOnDestroy() {
    if (this.statusInterval) clearInterval(this.statusInterval);
  }

  severityFor(estado: EstadoFactura): 'success' | 'warn' | 'danger' | 'secondary' {
    switch (estado) {
      case 'pendiente':
        return 'warn';
      case 'pagada':
        return 'success';
      case 'vencida':
        return 'danger';
      case 'anulada':
        return 'secondary';
    }
  }
}
