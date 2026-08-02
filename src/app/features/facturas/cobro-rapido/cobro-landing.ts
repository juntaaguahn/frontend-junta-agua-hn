import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, switchMap, lastValueFrom } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { DataViewModule } from 'primeng/dataview';
import { TagModule } from 'primeng/tag';
import { SkeletonModule } from 'primeng/skeleton';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { CheckboxModule } from 'primeng/checkbox';
import { MessageService } from 'primeng/api';
import { AbonadosService } from '../../../core/services/abonados.service';
import { FacturasService } from '../../../core/services/facturas.service';
import { Abonado, Factura } from '../../../core/models';

@Component({
  selector: 'app-cobro-landing',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    SelectModule,
    DataViewModule,
    TagModule,
    SkeletonModule,
    DialogModule,
    InputTextModule,
    TooltipModule,
    CheckboxModule,
  ],
  templateUrl: './cobro-landing.html',
  styleUrl: './cobro-landing.scss',
})
export class CobroLanding implements OnInit {
  private router = inject(Router);
  private abonadosSvc = inject(AbonadosService);
  private facturasSvc = inject(FacturasService);
  private msgs = inject(MessageService);

  abonados = signal<Abonado[]>([]);
  abonadoId = signal<number | null>(null);
  facturas = signal<Factura[]>([]);
  cargando = signal(false);

  showCorreoDialog = signal(false);
  correoFactura = signal<Factura | null>(null);
  correoDestino = signal('');
  enviando = signal(false);

  seleccion = signal<number[]>([]);
  enviandoSeleccion = signal(false);

  filtradas = computed(() => {
    const id = this.abonadoId();
    if (!id) return this.facturas();
    return this.facturas().filter((f) => f.abonado_id === id);
  });

  totalPendiente = computed(() => this.filtradas().reduce((acc, f) => acc + this.saldo(f), 0));

  search$ = new Subject<string>();

  ngOnInit() {
    this.cargar();
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
  }

  cargar() {
    this.cargando.set(true);
    this.facturasSvc.list({ estado: 'pendiente', limit: 200 }).subscribe({
      next: (res) => {
        this.facturas.set(res.data.filter((f) => this.saldo(f) > 0));
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.msgs.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar las facturas',
        });
      },
    });
  }

  buscarAbonado(q: string) {
    this.search$.next(q);
  }

  limpiar() {
    this.abonadoId.set(null);
  }

  saldo(f: Factura): number {
    return Number(f.total) - Number(f.total_pagado || 0);
  }

  isSelected(f: Factura): boolean {
    return f.id != null && this.seleccion().includes(f.id);
  }

  toggleSeleccion(f: Factura, checked: boolean) {
    if (f.id == null) return;
    this.seleccion.update((sel) =>
      checked ? (sel.includes(f.id!) ? sel : [...sel, f.id!]) : sel.filter((id) => id !== f.id),
    );
  }

  limpiarSeleccion() {
    this.seleccion.set([]);
  }

  enviarSeleccionados() {
    const ids = this.seleccion();
    if (!ids.length) return;
    const conEmail = this.facturas().filter(
      (f) => f.id != null && ids.includes(f.id) && f.abonado_email,
    );
    if (!conEmail.length) {
      this.msgs.add({
        severity: 'warn',
        summary: 'Sin correos',
        detail: 'Las facturas seleccionadas no tienen correo registrado',
      });
      return;
    }
    this.enviandoSeleccion.set(true);
    Promise.all(
      conEmail.map(async (f) => {
        try {
          await lastValueFrom(this.facturasSvc.enviarCorreo(f.id!, f.abonado_email));
          return true;
        } catch {
          return false;
        }
      }),
    ).then((res) => {
      this.enviandoSeleccion.set(false);
      const ok = res.filter(Boolean).length;
      const fail = res.length - ok;
      this.msgs.add({
        severity: fail ? 'warn' : 'success',
        summary: 'Correos enviados',
        detail: `${ok} enviado(s), ${fail} con error`,
      });
    });
  }

  compartir(f: Factura) {
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

  abrirCorreo(f: Factura) {
    this.correoFactura.set(f);
    this.correoDestino.set(f.abonado_email || '');
    this.showCorreoDialog.set(true);
  }

  enviarCorreo() {
    const id = this.correoFactura()?.id;
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

  cobrar(f: Factura) {
    this.router.navigate(['/facturas', f.id, 'cobro']);
  }
}
