// =====================================================
//  Modelos / Interfaces del dominio
// =====================================================

export type Rol = 'admin' | 'cajero' | 'lecturador';
export type EstadoUsuario = 'activo' | 'inactivo';

export interface Usuario {
  id: number;
  nombre: string;
  username: string;
  email?: string;
  rol: Rol;
  estado: EstadoUsuario;
  created_at?: string;
  password?: string; // sólo al crear/editar
}

export interface AuthResponse {
  user: UsuarioLogueado;
}

export interface UsuarioLogueado {
  id: number;
  nombre: string;
  username: string;
  email?: string;
  rol: Rol;
}

export interface Tegreso {
  egresoId?: number;
  descripcion: string;
  status: 'Y' | 'N';
}

export type EstadoAbonado = 'activo' | 'suspendido' | 'cortado';

export interface Abonado {
  id?: number;
  codigo: string;
  nombre: string;
  cedula?: string;
  direccion?: string;
  sector?: string;
  telefono?: string;
  medidor_numero?: string;
  tarifaId?: number;
  fecha_alta?: string;
  estado: EstadoAbonado;
  saldo_pendiente?: number;
}

export interface Tarifa {
  id?: number;
  concepto: string;
  descripcion?: string;
  valor: number;
  unidad?: string;
  estado: 'activo' | 'inactivo';
}

export interface Lectura {
  id?: number;
  abonado_id: number;
  periodo: string; // YYYY-MM
  lectura_anterior: number;
  lectura_actual: number;
  consumo_m3: number;
  fecha_lectura: string;
  usuario_id?: number;
  observacion?: string;
  factura_id?: number;
  created_at?: string;
  abonado_nombre?: string;
  abonado_codigo?: string;
  usuario_nombre?: string;
  sector?: string;
  medidor_numero?: string;
}

export type CreateLectura = Pick<
  Lectura,
  'abonado_id' | 'periodo' | 'lectura_actual' | 'fecha_lectura'
> &
  Pick<Partial<Lectura>, 'observacion'>;

export type UpdateLectura = Pick<
  Partial<Lectura>,
  'periodo' | 'lectura_actual' | 'fecha_lectura' | 'observacion'
>;

export type EstadoFactura = 'pendiente' | 'pagada' | 'vencida' | 'anulada';

export interface Factura {
  id?: number;
  abonado_id: number;
  periodo: string;
  lectura_id?: number;
  consumo_m3: number;
  subtotal_agua: number;
  excedente: number;
  alcantarillado: number;
  mora: number;
  multas: number;
  total: number;
  estado: EstadoFactura;
  fecha_emision: string;
  fecha_vencimiento: string;
  abonado_nombre?: string;
  abonado_codigo?: string;
  abonado_email?: string;
  total_pagado?: number;
}

export type MetodoPago = 'efectivo' | 'transferencia' | 'cheque' | 'tarjeta';

export interface Pago {
  id?: number;
  factura_id?: number;
  abonado_id: number;
  monto: number;
  efectivo_recibido?: number;
  cambio?: number;
  fecha_pago: string;
  metodo: MetodoPago;
  cajero_id?: number;
  concepto?: string;
  comprobante?: string;
  abonado_nombre?: string;
  abonado_codigo?: string;
  factura_periodo?: string;
  cajero_nombre?: string;
}

export interface MovimientoCaja {
  id?: number;
  tipo: 'ingreso' | 'egreso';
  concepto: string;
  monto: number;
  efectivo_recibido?: number;
  cambio?: number;
  fecha: string;
  usuario_id?: number;
  factura_id?: number;
  pago_id?: number;
  usuario_nombre?: string;
}

export type EstadoOrden = 'pendiente' | 'ejecutada' | 'anulada';

export interface OrdenCorte {
  id?: number;
  abonado_id: number;
  factura_id?: number;
  motivo?: string;
  fecha_emision: string;
  estado: EstadoOrden;
  fecha_ejecucion?: string;
  created_at?: string;
  abonado_codigo?: string;
  abonado_nombre?: string;
  sector?: string;
  direccion?: string;
  factura_total?: number;
}

export interface DashboardStats {
  recaudoMes: number;
  egresosMes: number;
  totalFacturasMes: number;
  abonados: {
    total: number;
    activos: number;
    suspendidos: number;
    cortados: number;
  };
  recaudadoHoy: number;
  saldoCaja: number;
  morosidadTotal: number;
  desgloseRecaudoHoy: {
    agua_base: number;
    excedente: number;
    alcantarillado: number;
    mora: number;
    multas: number;
  };
  recaudoMensual: { fecha: string; total: number }[];
  alertas: {
    consumosAtipicos: Lectura[];
    ordenesCortePendientes: number;
    facturasVencidas: { cantidad: number; monto: number };
  };
}

// Respuesta paginada genérica
export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

// Tipo auxiliar para reportes
export interface TransaccionPago {
  id: number;
  factura_id: number;
  operation_id: string;
  public_request_key?: string;
  status: 'pending' | 'completed' | 'failed' | 'expired';
  monto: number;
  metodo?: string;
  fecha_creacion: string;
  fecha_confirmacion?: string;
  periodo?: string;
  abonado?: string;
  abonado_codigo?: string;
  abonado_email?: string;
  factura_estado?: string;
}

export interface ReporteRecaudo {
  filtros: { des: string; hasta: string };
  totales: {
    cantidad: number;
    total: number;
    agua_base: number;
    excedente: number;
    alcantarillado: number;
    mora: number;
    multas: number;
  };
  detalle: Pago[];
}

export interface ReporteMorosidad {
  filtros: { sector: string };
  totales: {
    abonados_morosos: number;
    facturas_impagas: number;
    monto_total: number;
  };
  detalle: any[];
}

export interface Sector {
  sectorId?: number;
  descripcion: string;
  status: 'Y' | 'N';
}

export interface Parametro {
  id?: number;
  key_param: string;
  value_param: string;
  status: 'Y' | 'N';
}

export type EstadoPeriodo = 'A' | 'C';

export interface Periodo {
  id?: number;
  anio: string;
  periodo: string;
  status: EstadoPeriodo;
}

export interface UsuarioPeriodo {
  id?: number;
  usuarioId: number;
  periodoId: number;
  usuario_nombre?: string;
  usuario_username?: string;
  anio?: string;
  periodo_num?: string;
  periodo?: string;
  periodo_status?: EstadoPeriodo;
}

export interface ReporteResumen {
  totales: {
    total_facturado: number;
    total_pagado: number;
    total_mora: number;
  };
  recaudoMensual: { mes: string; total: number }[];
  morosidadSector: { sector: string; abonados: number; monto: number }[];
  topConsumidores: { codigo: string; nombre: string; consumo_total: number; lecturas: number }[];
}

export type ChatRol = 'usuario' | 'asistente';

export interface ChatMensaje {
  rol: ChatRol;
  contenido: string;
  error?: boolean;
}

export interface ChatRespuesta {
  respuesta: string;
}
