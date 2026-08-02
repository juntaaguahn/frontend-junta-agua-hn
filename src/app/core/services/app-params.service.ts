import { Injectable, computed, inject, signal } from '@angular/core';
import { ParametrosService } from './parametros.service';
import { Parametro } from '../models';

/**
 * Parámetros del sistema (tparametros) cargados una sola vez y expuestos
 * en toda la app: datos de la empresa, moneda, mensajes, redes, etc.
 */
@Injectable({ providedIn: 'root' })
export class AppParamsService {
  private service = inject(ParametrosService);

  private _params = signal<Parametro[]>([]);
  readonly params = this._params.asReadonly();
  readonly cargando = signal(false);

  valor(key: string): string {
    return this._params().find((p) => p.key_param === key)?.value_param ?? '';
  }

  readonly nombreEmpresa = computed(() => this.valor('nombre_empresa') || 'Junta de Agua');
  readonly moneda = computed(() => this.valor('moneda') || 'L');
  readonly mensajeFactura = computed(() => this.valor('mensaje_factura') || '');
  readonly mensajePago = computed(() => this.valor('mensaje_pago') || '¡Gracias por su pago!');
  readonly direccionEmpresa = computed(() => this.valor('direccion_empresa'));
  readonly emailEmpresa = computed(() => this.valor('email_empresa'));
  readonly facebookUrl = computed(() => this.valor('facebook_url'));
  readonly movilEmpresa = computed(() => this.valor('mobil1_empresa'));
  readonly representanteLegal = computed(() => this.valor('representate_legal'));

  cargar(): void {
    if (this.cargando() || this._params().length) return;
    this.cargando.set(true);
    this.service.list().subscribe({
      next: (res) => {
        this._params.set(res);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }
}
