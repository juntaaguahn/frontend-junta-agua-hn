import { DestroyRef, Injector, Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams, HttpRequest } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { MessageService } from 'primeng/api';
import { environment } from '../../../environments/environment';
import { OfflineStorageService } from './offline-storage.service';
import { DashboardStats } from '../models';

export interface QueuedRequest {
  key: string;
  method: 'POST' | 'PUT' | 'DELETE';
  url: string;
  body?: unknown;
  entity?: string;
  tempId?: number;
  createdAt: string;
}

const COLLECTION_ENTITIES = [
  'abonados',
  'facturas',
  'lecturas',
  'pagos',
  'caja',
  'ordenes',
  'tarifas',
  'tegresos',
  'sectores',
  'usuarios',
  'parametros',
  'periodos',
];

const PAGINATED_ENTITIES = ['abonados', 'facturas', 'lecturas', 'pagos', 'caja', 'ordenes'];

const HEARTBEAT_MS = 10_000;
const CACHE_MAX_ENTRIES = 500;

/** Campo PK de cada entidad según su tabla. */
const ENTITY_PK: Record<string, string> = {
  abonados: 'id',
  facturas: 'id',
  lecturas: 'id',
  pagos: 'id',
  caja: 'id',
  ordenes: 'id',
  tarifas: 'id',
  tegresos: 'egresoId',
  sectores: 'sectorId',
  usuarios: 'id',
  parametros: 'id',
  periodos: 'id',
};

/** Clave estable para una petición (método + URL + query params). */
export function requestKey(req: HttpRequest<unknown>): string {
  const params = req.params
    .keys()
    .sort()
    .map((k) => `${k}=${req.params.get(k)}`)
    .join('&');
  return params ? `${req.url}?${params}` : req.url;
}

/**
 * Orquesta el modo offline: réplica en IndexedDB, detección de caída del backend,
 * cola de mutaciones y sincronización automática al recuperar la conexión.
 */
@Injectable({ providedIn: 'root' })
export class OfflineService {
  private storage = inject(OfflineStorageService);
  private msg = inject(MessageService);
  private injector = inject(Injector);
  private destroyRef = inject(DestroyRef);

  private _offline = signal(false);
  readonly offline = this._offline.asReadonly();

  private _pending = signal(0);
  readonly pendingCount = this._pending.asReadonly();

  private _syncing = signal(false);
  readonly syncing = this._syncing.asReadonly();

  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private initialized = false;
  private onlineListener = () => this.markOnline();
  private offlineListener = () => this.markOffline();

  private get http(): HttpClient {
    return this.injector.get(HttpClient);
  }

  // ===== inicialización =====
  async init(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;
    await this.purgeCorruptCache();
    await this.refreshPending();
    window.addEventListener('online', this.onlineListener);
    window.addEventListener('offline', this.offlineListener);
    this.destroyRef.onDestroy(() => {
      window.removeEventListener('online', this.onlineListener);
      window.removeEventListener('offline', this.offlineListener);
      this.stopHeartbeat();
    });
    if (!this._offline()) {
      await this.prefetch();
    }
  }

  // ===== estado online/offline =====
  markOffline(): void {
    if (this._offline()) return;
    this._offline.set(true);
    this.startHeartbeat();
  }

  markOnline(): void {
    if (!this._offline()) return;
    this._offline.set(false);
    this.stopHeartbeat();
    void this.syncQueue();
  }

  retryConnection(): void {
    this.http
      .get<{ status: string }>(`${environment.apiUrl}/health`, {
        params: { _t: String(Date.now()) },
      })
      .subscribe({
        next: () => this.markOnline(),
        error: () => undefined,
      });
  }

  isConnectionError(err: unknown): boolean {
    const status = (err as { status?: number })?.status;
    return status === 0 || status === 502 || status === 503 || status === 504;
  }

  // ===== heartbeat (detección de recuperación) =====
  private startHeartbeat(): void {
    if (this.heartbeatTimer) return;
    this.heartbeatTimer = setInterval(() => {
      this.http
        .get<{ status: string }>(`${environment.apiUrl}/health`, {
          params: { _t: String(Date.now()) },
        })
        .subscribe({
          next: () => this.markOnline(),
          error: () => undefined,
        });
    }, HEARTBEAT_MS);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  // ===== caché y colecciones =====
  async cacheResponse(url: string, body: unknown): Promise<void> {
    await this.storage.set('cache', url, body);
    const entity = this.entityFromUrl(url);
    if (entity && COLLECTION_ENTITIES.includes(entity)) {
      const items = Array.isArray(body)
        ? body
        : Array.isArray((body as { data?: unknown })?.data)
          ? (body as { data: unknown[] }).data
          : null;
      if (items) await this.mergeCollection(entity, items);
    }
    await this.pruneCache();
  }

  async serveCachedGet(req: HttpRequest<unknown>): Promise<unknown | undefined> {
    const exact = await this.storage.get<unknown>('cache', requestKey(req));
    if (exact !== undefined && !this.isHttpEvent(exact)) {
      // El dashboard no usa la clave exacta (puede quedar vacía): se reconstruye de la réplica.
      if (this.isDashboardUrl(req.url)) {
        return this.buildDashboardStats();
      }
      return exact;
    }

    const entity = this.entityFromUrl(req.url);
    if (this.isDashboardUrl(req.url)) return this.buildDashboardStats();
    if (!entity || !COLLECTION_ENTITIES.includes(entity)) return undefined;

    const segs = this.urlSegments(req.url);
    if (segs.length >= 2) {
      const id = this.detailId(req.url);
      if (id == null) return undefined;
      const coll = await this.getCollection(entity);
      return coll.find((x) => String(this.idOf(entity, x)) === String(id));
    }

    const coll = await this.getCollection(entity);
    const filtered = this.filterCollectionByParams(coll, req.params);
    if (PAGINATED_ENTITIES.includes(entity)) {
      const page: any = {
        data: filtered,
        total: filtered.length,
        page: 1,
        limit: filtered.length,
        pages: 1,
      };
      if (entity === 'caja') page.resumen = this.cajaResumen(filtered);
      return page;
    }
    return filtered;
  }

  /** Aplica los filtros de query params de la petición (ej. ?abonado_id=5&estado=pendiente) a una colección local. */
  private filterCollectionByParams(coll: any[], params: HttpParams): any[] {
    const skip = new Set(['page', 'limit', 'sort', 'order', 'pageSize', 'perPage']);
    let result = coll;
    for (const k of params.keys()) {
      if (skip.has(k)) continue;
      const v = params.get(k);
      if (v == null || v === '') continue;
      result = result.filter((item) => {
        if (!item || typeof item !== 'object') return false;
        return String((item as Record<string, unknown>)[k]) === v;
      });
    }
    return result;
  }

  async getCollection(entity: string): Promise<any[]> {
    return (await this.storage.get<any[]>('collections', entity)) ?? [];
  }

  async upsertInCollection(entity: string, item: any, id?: string | number): Promise<void> {
    const coll = await this.getCollection(entity);
    const key = String(id ?? this.idOf(entity, item));
    const idx = coll.findIndex((x) => String(this.idOf(entity, x)) === key);
    if (idx >= 0) coll[idx] = item;
    else coll.push(item);
    await this.storage.set('collections', entity, coll);
  }

  async removeFromCollection(entity: string, id: string | number): Promise<void> {
    const coll = await this.getCollection(entity);
    await this.storage.set(
      'collections',
      entity,
      coll.filter((x) => String(this.idOf(entity, x)) !== String(id)),
    );
  }

  private async mergeCollection(entity: string, items: any[]): Promise<void> {
    const coll = await this.getCollection(entity);
    const map = new Map<string, any>(coll.map((x) => [String(this.idOf(entity, x)), x]));
    for (const it of items) {
      const id = this.idOf(entity, it);
      if (it && id != null) map.set(String(id), it);
    }
    await this.storage.set('collections', entity, [...map.values()]);
  }

  private async pruneCache(): Promise<void> {
    const entries = await this.storage.entries('cache');
    if (entries.length > CACHE_MAX_ENTRIES) {
      const sorted = [...entries].sort((a, b) => a.ts - b.ts);
      for (const r of sorted.slice(0, entries.length - CACHE_MAX_ENTRIES)) {
        await this.storage.remove('cache', r.key);
      }
    }
  }

  private cajaResumen(items: any[]): { ingresos: number; egresos: number; saldo: number } {
    let ingresos = 0;
    let egresos = 0;
    for (const it of items) {
      const monto = Number(it?.monto) || 0;
      if (it?.tipo === 'ingreso') ingresos += monto;
      else if (it?.tipo === 'egreso') egresos += monto;
    }
    return { ingresos, egresos, saldo: ingresos - egresos };
  }

  entityFromUrl(url: string): string | null {
    const segs = this.urlSegments(url);
    return segs.length ? segs[0] : null;
  }

  private isDashboardUrl(url: string): boolean {
    const segs = this.urlSegments(url);
    return segs.length >= 2 && segs[0] === 'dashboard' && segs[1] === 'stats';
  }

  /** Reconstruye las stats del dashboard a partir de la réplica local (colecciones). */
  private async buildDashboardStats(): Promise<DashboardStats> {
    const [abonados, pagos, caja, facturas, lecturas, ordenes] = await Promise.all([
      this.getCollection('abonados'),
      this.getCollection('pagos'),
      this.getCollection('caja'),
      this.getCollection('facturas'),
      this.getCollection('lecturas'),
      this.getCollection('ordenes'),
    ]);

    const ahora = new Date();
    const mesActual = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}`;
    const diaActual = `${mesActual}-${String(ahora.getDate()).padStart(2, '0')}`;
    const inMonth = (f?: string): boolean => !!f && f.slice(0, 7) === mesActual;
    const inDay = (f?: string): boolean => !!f && f.slice(0, 10) === diaActual;

    const abonadosPorEstado = new Map<string, number>();
    for (const a of abonados) {
      const st = (a as { estado?: string })?.estado ?? 'activo';
      abonadosPorEstado.set(st, (abonadosPorEstado.get(st) ?? 0) + 1);
    }
    const total =
      abonadosPorEstado.get('activo')! +
      abonadosPorEstado.get('suspendido')! +
      abonadosPorEstado.get('cortado')!;

    const sum = (items: unknown[], pick: (x: any) => number | undefined): number =>
      items.reduce<number>((acc, x) => acc + (Number(pick(x)) || 0), 0);

    const recaudoMes = sum(
      pagos.filter((p) => inMonth((p as { fecha_pago?: string }).fecha_pago)),
      (p) => p.monto,
    );
    const recaudadoHoy = sum(
      pagos.filter((p) => inDay((p as { fecha_pago?: string }).fecha_pago)),
      (p) => p.monto,
    );

    const recaudoMensual: { fecha: string; total: number }[] = [];
    const porDia = new Map<string, number>();
    for (const p of pagos) {
      const f = (p as { fecha_pago?: string }).fecha_pago;
      if (inMonth(f))
        porDia.set(f!.slice(0, 10), (porDia.get(f!.slice(0, 10)) ?? 0) + (Number(p.monto) || 0));
    }
    for (const [fecha, totalDia] of [...porDia.entries()].sort()) {
      recaudoMensual.push({ fecha, total: totalDia });
    }

    const egresosMes = sum(
      caja.filter(
        (c) =>
          (c as { tipo?: string }).tipo === 'egreso' && inMonth((c as { fecha?: string }).fecha),
      ),
      (c) => c.monto,
    );
    const ingresosCaja = sum(
      caja.filter((c) => (c as { tipo?: string }).tipo === 'ingreso'),
      (c) => c.monto,
    );
    const egresosCaja = sum(
      caja.filter((c) => (c as { tipo?: string }).tipo === 'egreso'),
      (c) => c.monto,
    );

    const facturasMes = facturas.filter((f) =>
      inMonth((f as { fecha_emision?: string }).fecha_emision),
    );
    const morosas = facturas.filter((f) =>
      ['pendiente', 'vencida'].includes((f as { estado?: string }).estado ?? ''),
    );
    const vencidas = facturas.filter((f) => (f as { estado?: string }).estado === 'vencida');

    const hoyDia = `${mesActual}-${String(ahora.getDate()).padStart(2, '0')}`;
    const facturasPagadasHoy = facturas.filter(
      (f) =>
        (f as { estado?: string }).estado === 'pagada' &&
        inDay((f as { fecha_emision?: string }).fecha_emision),
    );

    return {
      recaudoMes,
      egresosMes,
      totalFacturasMes: facturasMes.length,
      abonados: {
        total,
        activos: abonadosPorEstado.get('activo') ?? 0,
        suspendidos: abonadosPorEstado.get('suspendido') ?? 0,
        cortados: abonadosPorEstado.get('cortado') ?? 0,
      },
      recaudadoHoy,
      saldoCaja: ingresosCaja - egresosCaja,
      morosidadTotal: sum(morosas, (f) => f.total),
      desgloseRecaudoHoy: {
        agua_base: sum(facturasPagadasHoy, (f) => f.subtotal_agua),
        excedente: sum(facturasPagadasHoy, (f) => f.excedente),
        alcantarillado: sum(facturasPagadasHoy, (f) => f.alcantarillado),
        mora: sum(facturasPagadasHoy, (f) => f.mora),
        multas: sum(facturasPagadasHoy, (f) => f.multas),
      },
      recaudoMensual,
      alertas: {
        consumosAtipicos: this.consumosAtipicos(lecturas),
        ordenesCortePendientes: ordenes.filter(
          (o) => (o as { estado?: string }).estado === 'pendiente',
        ).length,
        facturasVencidas: {
          cantidad: vencidas.length,
          monto: sum(vencidas, (f) => f.total),
        },
      },
    } as DashboardStats;
  }

  /** Consumos atípicos (consumo > 3x promedio histórico del abonado) desde la réplica. */
  private consumosAtipicos(lecturas: unknown[]): {
    id?: number;
    abonado_id: number;
    abonado_nombre?: string;
    abonado_codigo?: string;
    periodo?: string;
    consumo_m3: number;
  }[] {
    const porAbonado = new Map<number, number[]>();
    for (const l of lecturas) {
      const ab = (l as { abonado_id?: number }).abonado_id;
      const consumo = Number((l as { consumo_m3?: number }).consumo_m3) || 0;
      if (ab != null && consumo > 0) {
        if (!porAbonado.has(ab)) porAbonado.set(ab, []);
        porAbonado.get(ab)!.push(consumo);
      }
    }
    const out: {
      abonado_id: number;
      abonado_nombre?: string;
      abonado_codigo?: string;
      periodo?: string;
      consumo_m3: number;
    }[] = [];
    for (const l of lecturas) {
      const x = l as {
        id?: number;
        abonado_id: number;
        abonado_nombre?: string;
        abonado_codigo?: string;
        periodo?: string;
        consumo_m3: number;
      };
      const historial = porAbonado.get(x.abonado_id);
      if (!historial || historial.length < 2) continue;
      const promedio = historial.reduce((a, b) => a + b, 0) / historial.length;
      if (Number(x.consumo_m3) > promedio * 3) {
        out.push({ id: x.id, ...x });
      }
    }
    return out.slice(0, 10);
  }

  private urlSegments(url: string): string[] {
    const base = environment.apiUrl;
    const clean = url.split('?')[0];
    const rest = clean.startsWith(base) ? clean.slice(base.length) : clean;
    return rest.split('/').filter(Boolean);
  }

  private idOf(entity: string, item: unknown): string | number | null {
    const pk = ENTITY_PK[entity] ?? 'id';
    const v = (item as Record<string, unknown>)?.[pk];
    return v == null ? null : (v as string | number);
  }

  /** Detecta valores corruptos de eventos HTTP (ej. {type: 0}) escritos por un bug previo. */
  private isHttpEvent(v: unknown): boolean {
    if (typeof v !== 'object' || v === null) return false;
    const t = (v as { type?: unknown }).type;
    return typeof t === 'number' && (v as { body?: unknown }).body === undefined;
  }

  /** Elimina entradas corruptas de la tienda cache (eventos HTTP guardados como body). */
  private async purgeCorruptCache(): Promise<void> {
    const entries = await this.storage.entries('cache');
    const bad = entries.filter((e) => this.isHttpEvent(e.value));
    for (const e of bad) {
      await this.storage.remove('cache', e.key);
    }
  }

  private detailId(url: string): number | null {
    const segs = this.urlSegments(url);
    const last = segs[segs.length - 1];
    return last && /^\d+$/.test(last) ? Number(last) : null;
  }

  // ===== cola de mutaciones =====
  async enqueue(
    method: 'POST' | 'PUT' | 'DELETE',
    url: string,
    body: unknown,
    entity?: string,
    tempId?: number,
  ): Promise<void> {
    const item: QueuedRequest = {
      key: uuid(),
      method,
      url,
      body,
      entity,
      tempId,
      createdAt: new Date().toISOString(),
    };
    await this.storage.set('queue', item.key, item);
    await this.refreshPending();
  }

  async pendingRequests(): Promise<QueuedRequest[]> {
    const all = await this.storage.all<QueuedRequest>('queue');
    return all.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async queueMutation(req: HttpRequest<unknown>): Promise<unknown> {
    const entity = this.entityFromUrl(req.url) ?? undefined;
    const body = req.body;
    const method = req.method as 'POST' | 'PUT' | 'DELETE';

    if (method === 'DELETE') {
      const id = this.detailId(req.url);
      if (id != null && entity && COLLECTION_ENTITIES.includes(entity)) {
        await this.removeFromCollection(entity, id);
      }
      await this.enqueue(method, req.url, body, entity);
      return {};
    }

    if (method === 'POST') {
      const tempId = -Math.floor(Date.now() / 1000) - Math.floor(Math.random() * 1000);
      const optimistic = { ...(body ?? {}), id: tempId } as any;
      if (entity && COLLECTION_ENTITIES.includes(entity)) {
        await this.upsertInCollection(entity, optimistic);
      }
      await this.enqueue(method, req.url, body, entity, tempId);
      return optimistic;
    }

    const id = this.detailId(req.url);
    const realId = id ?? (body as any)?.id;
    const optimistic = { ...(body ?? {}), id: realId } as any;
    if (entity && COLLECTION_ENTITIES.includes(entity)) {
      await this.upsertInCollection(entity, optimistic, realId);
    }
    await this.enqueue(method, req.url, body, entity);
    return optimistic;
  }

  // ===== sincronización =====
  async syncQueue(): Promise<void> {
    if (this._offline() || this._syncing()) return;
    const pending = await this.pendingRequests();
    if (!pending.length) return;

    this._syncing.set(true);
    try {
      for (const item of pending) {
        try {
          const res: any = await lastValueFrom(
            this.http.request(item.method, item.url, {
              body: item.body,
              headers: { 'X-Offline-Sync': '1' },
            }),
          );
          await this.storage.remove('queue', item.key);
          if (
            item.method === 'POST' &&
            item.tempId &&
            item.entity &&
            res?.id != null &&
            Number(res.id) !== item.tempId
          ) {
            await this.replaceTempId(item, res);
          }
          await this.refreshPending();
        } catch (err: unknown) {
          if (this.isConnectionError(err)) {
            this.markOffline();
            return;
          }
          await this.storage.remove('queue', item.key);
          await this.refreshPending();
          const detalle =
            (err as any)?.error?.error || (err as any)?.error?.message || 'error al sincronizar';
          this.msg.add({
            severity: 'error',
            summary: 'Sincronización',
            detail: `No se pudo sincronizar una operación: ${detalle}`,
          });
        }
      }
    } finally {
      this._syncing.set(false);
    }
    await this.prefetch();
  }

  private async replaceTempId(item: QueuedRequest, res: any): Promise<void> {
    const coll = await this.getCollection(item.entity!);
    const idx = coll.findIndex((x) => String(this.idOf(item.entity!, x)) === String(item.tempId));
    if (idx >= 0) {
      coll[idx] = res;
      await this.storage.set('collections', item.entity!, coll);
    }
  }

  // ===== réplica inicial =====
  private async prefetch(): Promise<void> {
    if (this._offline()) return;
    const api = environment.apiUrl;
    const targets: { url: string; params?: Record<string, string> }[] = [
      { url: `${api}/abonados`, params: { page: '1', limit: '100' } },
      { url: `${api}/facturas`, params: { page: '1', limit: '100' } },
      { url: `${api}/lecturas`, params: { page: '1', limit: '100' } },
      { url: `${api}/pagos`, params: { page: '1', limit: '100' } },
      { url: `${api}/caja`, params: { page: '1', limit: '100' } },
      { url: `${api}/ordenes`, params: { page: '1', limit: '100' } },
      { url: `${api}/tarifas` },
      { url: `${api}/tegresos` },
      { url: `${api}/sectores` },
      { url: `${api}/usuarios` },
      { url: `${api}/parametros` },
      { url: `${api}/periodos` },
      { url: `${api}/dashboard/stats` },
    ];
    await Promise.allSettled(
      targets.map((t) => lastValueFrom(this.http.get(t.url, { params: t.params }))),
    );
  }

  // ===== limpieza =====
  async clearAllData(): Promise<void> {
    await this.storage.clearStore('cache');
    await this.storage.clearStore('collections');
    await this.storage.clearStore('queue');
    this._pending.set(0);
  }

  private async refreshPending(): Promise<void> {
    const all = await this.storage.all<QueuedRequest>('queue');
    this._pending.set(all.length);
  }
}

function uuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}
