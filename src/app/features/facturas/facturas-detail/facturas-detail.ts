import {
  Component,
  inject,
  signal,
  ElementRef,
  ChangeDetectorRef,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { FacturasService } from '../../../core/services/facturas.service';
import { TodoPagoService } from '../../../core/services/todopago.service';
import { NavegacionService } from '../../../core/services/navegacion.service';
import { AppParamsService } from '../../../core/services/app-params.service';
import { Factura, EstadoFactura, TransaccionPago } from '../../../core/models';

@Component({
  selector: 'app-facturas-detail',
  standalone: true,
  imports: [
    CommonModule,
    DecimalPipe,
    FormsModule,
    ButtonModule,
    InputTextModule,
    DialogModule,
    TagModule,
    TableModule,
    SkeletonModule,
    TooltipModule,
  ],
  templateUrl: './facturas-detail.html',
  styleUrl: './facturas-detail.scss',
})
export class FacturasDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private service = inject(FacturasService);
  private tpSvc = inject(TodoPagoService);
  private msgs = inject(MessageService);
  private nav = inject(NavegacionService);
  private cdr = inject(ChangeDetectorRef);
  private el = inject(ElementRef);
  readonly params = inject(AppParamsService);

  cargando = signal(true);
  factura = signal<Factura | null>(null);
  showCorreoDialog = signal(false);
  showImprimirDialog = signal(false);
  correoDestino = signal('');
  enviando = signal(false);

  tpEnabled = signal(true); // sandbox por defecto; el backend confirma si hay credenciales
  tpGenerando = signal(false);
  tpLink = signal<string | null>(null);
  tpOperationId = signal<string | null>(null);
  tpStatus = signal<string | null>(null);
  transacciones = signal<TransaccionPago[]>([]);
  private statusInterval: ReturnType<typeof setInterval> | null = null;

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    const imprimir = this.route.snapshot.queryParamMap.get('imprimir');
    this.service.get(+id).subscribe({
      next: (f) => {
        this.factura.set(f);
        this.correoDestino.set(f.abonado_email || '');
        document.title = `Factura #${f.id} - ${f.abonado_nombre || ''} - ${f.periodo}`;
        if (imprimir === '1') this.showImprimirDialog.set(true);
        this.cargando.set(false);
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

  editar() {
    const id = this.factura()?.id;
    if (id) this.router.navigate(['/facturas', id, 'editar']);
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

        // Refrescar transacciones
        this.cargarTransacciones(f.id!);

        // Polling de status cada 10s si está pendiente
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

  limpiarLinkPago() {
    if (this.statusInterval) clearInterval(this.statusInterval);
    this.statusInterval = null;
    this.tpLink.set(null);
    this.tpOperationId.set(null);
    this.tpStatus.set(null);
  }

  cargarTransacciones(facturaId: number) {
    this.tpSvc.listarTransacciones(facturaId).subscribe({
      next: (res) => this.transacciones.set(res),
      error: () => {},
    });
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
    this.service.downloadPDF(f.id).subscribe({
      next: (blob) => {
        const file = new File([blob], `factura-${f.id}.pdf`, { type: 'application/pdf' });
        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          navigator
            .share({
              files: [file],
              title: `Factura #${f.id}`,
              text: `Factura #${f.id} — Período ${f.periodo} — Total: ${this.params.moneda()} ${f.total}`,
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
    this.service.enviarCorreo(id, this.correoDestino()).subscribe({
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
