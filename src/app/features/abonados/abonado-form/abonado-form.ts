import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import { DatePickerModule } from 'primeng/datepicker';
import { MessageService } from 'primeng/api';
import { AbonadosService } from '../../../core/services/abonados.service';
import { SectoresService } from '../../../core/services/sectores.service';
import { TarifasService } from '../../../core/services/tarifas.service';
import { EstadoAbonado, Sector, Tarifa } from '../../../core/models';
import { CorrelativoService } from '../../../core/services/correlativo.service';
import { NavegacionService } from '../../../core/services/navegacion.service';

@Component({
  selector: 'app-abonado-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    SelectModule,
    DialogModule,
    TooltipModule,
    DatePickerModule,
  ],
  templateUrl: './abonado-form.html',
  styleUrl: './abonado-form.scss',
})
export class AbonadoForm implements OnInit {
  private fb = inject(FormBuilder);
  private service = inject(AbonadosService);
  private sectoresService = inject(SectoresService);
  private tarifasService = inject(TarifasService);
  private route = inject(ActivatedRoute);
  private msgs = inject(MessageService);
  private nav = inject(NavegacionService);
  private correlativoService = inject(CorrelativoService);

  esEdicion = signal(false);
  cargando = signal(false);
  guardando = signal(false);
  titulo = signal('Nuevo abonado');
  ahora = new Date();
  segundos = signal(0);

  sectorOptions = signal<Sector[]>([]);
  tarifaOptions = signal<Tarifa[]>([]);
  dialogVisible = signal(false);
  nuevaDescripcion = signal('');
  guardandoSector = signal(false);

  readonly estadoOptions = [
    { label: 'Activo', value: 'activo' as EstadoAbonado },
    { label: 'Suspendido', value: 'suspendido' as EstadoAbonado },
    { label: 'Cortado', value: 'cortado' as EstadoAbonado },
  ];

  form!: FormGroup;

  ngOnInit() {
    this.cargarSectores();
    this.cargarTarifas();

    const uui = this.correlativoService.generarCodigo(this.ahora);

    this.form = this.fb.group({
      codigo: [uui, [Validators.required, Validators.maxLength(30)]],
      nombre: ['', [Validators.required, Validators.maxLength(150)]],
      cedula: ['', [Validators.required, Validators.maxLength(20)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(120)]],
      direccion: ['', [Validators.maxLength(200)]],
      sector: ['', [Validators.maxLength(80)]],
      telefono: ['', [Validators.maxLength(30)]],
      medidor_numero: ['', [Validators.maxLength(40)]],
      tarifaId: [null],
      fecha_alta: [new Date()],
      estado: ['activo' as EstadoAbonado, Validators.required],
    });

    this.form.get('tarifaId')?.valueChanges.subscribe(() => this.aplicarReglaMedidor());

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.esEdicion.set(true);
      this.titulo.set('Editar abonado');
      this.cargando.set(true);
      this.service.get(+id).subscribe({
        next: (a) => {
          this.form.patchValue({
            ...a,
            fecha_alta: a.fecha_alta ? new Date(a.fecha_alta) : new Date(),
          });
          this.cargando.set(false);
        },
        error: () => {
          this.cargando.set(false);
          this.msgs.add({ severity: 'error', summary: 'Error', detail: 'Abonado no encontrado' });
          this.volver();
        },
      });
    }
  }

  cargarSectores() {
    this.sectoresService.list().subscribe({
      next: (sectores) => this.sectorOptions.set(sectores),
    });
  }

  cargarTarifas() {
    this.tarifasService.list().subscribe({
      next: (tarifas) => {
        this.tarifaOptions.set(
          tarifas
            .filter(
              (t) => t.estado === 'activo' && ['agua_base', 'Metros cubicos'].includes(t.concepto),
            )
            .sort((a, b) => a.concepto.localeCompare(b.concepto)),
        );
        this.aplicarReglaMedidor();
      },
    });
  }

  private aplicarReglaMedidor() {
    const tarifaId = this.form?.get('tarifaId')?.value;
    const medidorCtrl = this.form?.get('medidor_numero');
    if (!this.form || !medidorCtrl) return;

    const tarifa = this.tarifaOptions().find((t) => t.id === tarifaId);
    const esAguaBase = tarifa?.concepto === 'agua_base';

    if (esAguaBase) {
      medidorCtrl.clearValidators();
      medidorCtrl.setValue('N/A');
      medidorCtrl.disable();
    } else {
      medidorCtrl.setValidators([Validators.required, Validators.maxLength(40)]);
      medidorCtrl.enable();
      if (medidorCtrl.value === 'N/A') medidorCtrl.setValue('');
      medidorCtrl.updateValueAndValidity();
    }
  }

  abrirNuevoSector() {
    this.nuevaDescripcion.set('');
    this.dialogVisible.set(true);
  }

  guardarNuevoSector() {
    const desc = this.sanitize(this.nuevaDescripcion().trim());
    if (!desc) return;
    this.guardandoSector.set(true);
    this.sectoresService.create({ descripcion: desc }).subscribe({
      next: (sector) => {
        this.guardandoSector.set(false);
        this.dialogVisible.set(false);
        this.sectorOptions.update((opts) =>
          [...opts, sector].sort((a, b) => a.descripcion.localeCompare(b.descripcion)),
        );
        this.form.get('sector')?.setValue(sector.descripcion);
        this.msgs.add({
          severity: 'success',
          summary: 'Sector',
          detail: 'Sector creado correctamente',
        });
      },
      error: () => {
        this.guardandoSector.set(false);
        this.msgs.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo crear el sector',
        });
      },
    });
  }

  private sanitize(val: any): any {
    if (typeof val === 'string') {
      return val.replace(/<[^>]*>/g, '').replace(/[<>"']/g, '');
    }
    return val;
  }

  private sanitizePayload(obj: Record<string, any>): Record<string, any> {
    const clean: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
      clean[k] = this.sanitize(v);
    }
    return clean;
  }

  guardar() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const payload = this.sanitizePayload({
      ...raw,
      fecha_alta: this.formatFecha(raw.fecha_alta),
    });

    this.guardando.set(true);
    const op = this.esEdicion()
      ? this.service.update(+this.route.snapshot.paramMap.get('id')!, payload)
      : this.service.create(payload);

    op.subscribe({
      next: () => {
        this.guardando.set(false);
        this.msgs.add({
          severity: 'success',
          summary: 'Guardado',
          detail: this.esEdicion() ? 'Abonado actualizado' : 'Abonado creado correctamente',
        });
        this.volver();
      },
      error: () => {
        this.guardando.set(false);
        this.msgs.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo guardar el abonado',
        });
      },
    });
  }

  volver() {
    this.nav.volver(['/abonados']);
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
