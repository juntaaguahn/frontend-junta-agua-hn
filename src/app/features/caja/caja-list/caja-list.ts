import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DataViewModule } from 'primeng/dataview';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { TagModule } from 'primeng/tag';
import { MessageService } from 'primeng/api';
import { DataViewLazyLoadEvent } from 'primeng/dataview';
import { CajaService, CajaListResponse } from '../../../core/services/caja.service';
import { TegresosService } from '../../../core/services/tegresos.service';
import { MovimientoCaja, Tegreso } from '../../../core/models';

@Component({
  selector: 'app-caja-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    DataViewModule,
    InputTextModule,
    SelectModule,
    DatePickerModule,
    DialogModule,
    InputNumberModule,
    TagModule,
  ],
  templateUrl: './caja-list.html',
  styleUrl: './caja-list.scss',
})
export class CajaList implements OnInit {
  private service = inject(CajaService);
  private tegresosService = inject(TegresosService);
  private msgs = inject(MessageService);

  data = signal<MovimientoCaja[]>([]);
  total = signal(0);
  cargando = signal(false);
  resumen = signal<CajaListResponse['resumen'] | null>(null);

  q = signal('');
  desFiltro = signal<Date | null>(null);
  hastaFiltro = signal<Date | null>(null);
  tipoFiltro = signal<string>('');

  showDialogEgreso = signal(false);
  guardandoEgreso = signal(false);
  tegresosOptions = signal<Tegreso[]>([]);
  egresoForm = { concepto: '', monto: null as number | null, fecha: '' };

  readonly tipoOptions = [
    { label: 'Todos', value: '' },
    { label: 'Ingreso', value: 'ingreso' },
    { label: 'Egreso', value: 'egreso' },
  ];

  private page = 1;
  private limit = 20;

  ngOnInit() {
    this.cargar();
  }

  cargar() {
    this.cargando.set(true);
    const des = this.desFiltro();
    const hasta = this.hastaFiltro();
    this.service
      .list({
        des: des
          ? (des instanceof Date ? des : new Date(des)).toISOString().slice(0, 10)
          : undefined,
        hasta: hasta
          ? (hasta instanceof Date ? hasta : new Date(hasta)).toISOString().slice(0, 10)
          : undefined,
        tipo: this.tipoFiltro() || undefined,
        q: this.q() || undefined,
        page: this.page,
        limit: this.limit,
      })
      .subscribe({
        next: (res) => {
          this.data.set(res.data);
          this.total.set(res.total);
          this.resumen.set(res.resumen);
          this.cargando.set(false);
        },
        error: () => this.cargando.set(false),
      });
  }

  buscar() {
    this.page = 1;
    this.cargar();
  }

  limpiarFiltros() {
    this.desFiltro.set(null);
    this.hastaFiltro.set(null);
    this.tipoFiltro.set('');
    this.q.set('');
    this.buscar();
  }

  onPage(e: DataViewLazyLoadEvent) {
    this.page = e.first! / e.rows! + 1;
    this.limit = e.rows!;
    this.cargar();
  }

  abrirDialogEgreso() {
    const hoy = new Date().toISOString().slice(0, 10);
    this.egresoForm = { concepto: '', monto: null, fecha: hoy };
    this.showDialogEgreso.set(true);
    this.tegresosService.list().subscribe({
      next: (res: Tegreso[]) => this.tegresosOptions.set(res.filter((t) => t.status === 'Y')),
    });
  }

  guardarEgreso() {
    if (!this.egresoForm.concepto || !this.egresoForm.monto || !this.egresoForm.fecha) return;
    this.guardandoEgreso.set(true);
    this.service
      .create({
        tipo: 'egreso',
        concepto: this.egresoForm.concepto,
        monto: this.egresoForm.monto,
        fecha: this.egresoForm.fecha,
      })
      .subscribe({
        next: () => {
          this.guardandoEgreso.set(false);
          this.showDialogEgreso.set(false);
          this.msgs.add({ severity: 'success', summary: 'Egreso registrado' });
          this.buscar();
        },
        error: () => {
          this.guardandoEgreso.set(false);
          this.msgs.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo registrar el egreso',
          });
        },
      });
  }

  tipoLabel(tipo: string): string {
    return tipo === 'ingreso' ? 'Ingreso' : 'Egreso';
  }
}
