# Junta de Agua - Frontend (Angular 21 + PrimeNG)

App de gestión administrativa para juntas de agua potable.

## Stack

- **Framework**: Angular 21 (standalone components, sin NgModules)
- **UI Library**: PrimeNG 21 + PrimeIcons + PrimeFlex
- **Estilos**: SCSS
- **Package Manager**: npm 11
- **TypeScript**: Strict mode habilitado

## Scripts

- `npm start` - Servidor de desarrollo (`ng serve`)
- `npm run build` - Build producción (`ng build`)
- `npm run watch` - Build dev con watch
- `npm test` - Tests via Karma (`ng test`)

## Estructura

```
src/
├── app/
│   ├── core/           # Guards, interceptors, models, services
│   ├── features/       # Módulos funcionales (11 dominios)
│   │   ├── abonados/
│   │   ├── auth/
│   │   ├── caja/
│   │   ├── configuracion/
│   │   ├── dashboard/
│   │   ├── facturas/
│   │   ├── lecturas/
│   │   ├── pagos/
│   │   ├── reportes/
│   │   ├── tarifas/
│   │   └── usuarios/
│   ├── layout/         # main-layout con shell de la app
│   ├── app.config.ts   # Config providers global
│   ├── app.routes.ts   # Definición de rutas
│   └── app.ts          # Componente raíz
│   environments/       # Variables de entorno
```

## Convenciones

- Componentes standalone (no declarar en NgModules)
- SCSS con mixins/variables de PrimeNG
- Rutas lazy-loaded por feature
- Servicios en `core/services/` con patrón singleton (providedIn: 'root')
- Modelos e interfaces en `core/models/`
- Guards funcionales en `core/guards/`
- Interceptores funcionales en `core/interceptors/`

### Navegación "Volver" (`core/services/navegacion.service.ts`)

- Todos los botones "Volver" de forms/details deben usar `NavegacionService.volver(fallback)` (inyectado como `private nav = inject(NavegacionService)`), NO `router.navigate` a una ruta fija
- `volver(fallback)` hace `Location.back()` (regresa al origen real del navegador, ej. dashboard → nueva lectura → volver regresa a dashboard); solo navega a `fallback` si no hay historial previo
- `fallback` es la ruta de lista del dominio (ej. `['/lecturas']`)

### Autenticación y sesión (`core/services/auth.service.ts`)

- Sesión por **cookies HttpOnly** (`ja_token` access + `ja_refresh` refresh) que setea el backend; **el JWT nunca va en localStorage** (mitiga XSS)
- En localStorage solo queda `ja_user` (perfil, no sensible) y `ja_session=1` (flag para offline con sesión previa)
- El `authInterceptor` pone `withCredentials: true` en todas las peticiones (cookies cross-origin en dev)
- `refreshInterceptor` (en `app.config.ts`): ante un 401 llama `POST /auth/refresh` (rotación de refresh token) y reintenta 1 vez con header `X-Auth-Retry`; si falla, `errorInterceptor` cierra sesión
- `logout()` llama `POST /auth/logout` (revoca el refresh token en BD) y luego limpia el estado local
- Guard de ruta: `authGuard` (sesión) en el layout raíz; `rolGuard('admin')` en rutas admin (usuarios, tarifas, tegresos, sectores, parametros, periodos, usuarios-periodo, configuracion)

### Modo offline (`core/services/offline.service.ts` + `core/interceptors/offline.interceptor.ts`)

- Réplica en **IndexedDB** (`offline-storage.service.ts`, stores: `cache`, `collections`, `queue`, `kv`)
- El interceptor (primero en `app.config.ts`) detecta caída del backend (status 0/502/503/504), hace **write-through cache** de cada GET exitoso y, offline, sirve de la réplica y **encola mutaciones** (POST/PUT/DELETE) para sincronizar al volver la conexión
- `OfflineService` maneja: señales `offline`/`pendingCount`/`syncing`, heartbeat a `/api/health`, sync FIFO de la cola, prefetch inicial de entidades, y acceso offline con sesión previa (el guard valida el flag `ja_session`, no el token)
- Reintentos de sync usan header `X-Offline-Sync` para que el interceptor NO los re-encuele
- Banner de estado: `layout/offline-banner/`, se muestra en `main-layout`
- Al hacer login/logout se limpia la réplica (`AuthService` → `OfflineService.clearAllData()`)
- TodoPago, login, refresh, logout, blobs y health **siempre requieren red** (no se cachean ni encolan)

#### Flujo de sincronización (al volver la conexión)

Al detectar la recuperación (heartbeat), `markOnline()` dispara `syncQueue()`:

1. **Replay FIFO**: reenvía cada mutación encolada (POST/PUT/DELETE) al backend con header `X-Offline-Sync: 1` (evita re-encolado).
2. **Reemplaza ID temporal**: si fue un POST, el backend responde con el `id` real → `replaceTempId()` actualiza la colección local (el item con id negativo pasa al id real).
3. **Limpia la cola**: elimina el item de `queue`, `pendingCount` baja a 0 y el banner deja de mostrar "Cambios pendientes".
4. **Prefetch final**: refresca toda la réplica con datos frescos del backend.
5. El backend procesa la mutación normalmente (ej. un pago marca la factura como pagada y crea el movimiento de caja).
6. Si una mutación falla con error de negocio (ej. factura ya pagada), se muestra toast "No se pudo sincronizar una operación" y el item se descarta de la cola para no bloquear el resto.

#### Detalle crítico del interceptor (eventos HTTP de réplica)

Al servir datos de la réplica, el interceptor DEBE devolver un `HttpResponse` real (`of(new HttpResponse({ body: cached, status: 200 }))`), **no** el dato pelado (`of(cached)`). Si se emite el dato crudo, Angular lo descarta silenciosamente (no dispara `next` ni `error` en el componente) y la petición queda colgada: el dashboard se congela en blanco sin error. Aplica a: GET cacheado, `/auth/me` y la respuesta optimista de mutaciones.

#### Filtros de lista en modo offline (`serveCachedGet`)

- `serveCachedGet` hace fallback a la réplica solo cuando no existe clave exacta cacheada (petición nunca vista online). En ese fallback **debe aplicar los query params de la petición a la colección local** (`filterCollectionByParams` en `offline.service.ts`), ignorando solo params de paginación (`page`, `limit`, `sort`, `order`, `pageSize`, `perPage`).
- Sin ese filtro, una petición como `GET /api/facturas?abonado_id=5&estado=pendiente&limit=50` devolvía TODAS las facturas de todos los abonados (bug real: la card "Factura a cobrar" de Pagos mostraba facturas de todos los clientes en modo offline).
- Regla: si se toca el fallback de réplica, replicar la lógica de filtrado del backend (filtros por campos + búsqueda) o volver a caer en el mismo bug.

## Dominios y funcionalidades clave

### Pagos (`features/pagos/`)

- `efectivo_recibido` y `cambio`: campos visibles solo cuando método es `efectivo`, cambio se auto-calc
- El formulario (`pagos-form`) usa `esEfectivo` signal computado del valor de `metodo`
- El detalle (`pagos-detail`) muestra ambos campos en ficha y ticket térmico
- Página de callback `/pagos/confirmado` para confirmación de pagos online (TodoPago)
- Lista (`pagos-list`) tiene botón "Anular" con confirm dialog, llama a DELETE /api/pagos/:id
- Anulación: revierte factura a pendiente, elimina movimiento de caja por pago_id, marca transacción TP como 'reversed'

### Caja (`features/caja/`)

- Módulo reconstruido con filtros (desde, hasta, tipo), cards de resumen (ingresos/egresos/saldo)
- Tabla lazy paginada con efectivo recibido y cambio
- Diálogo "Registrar egreso" con `p-fluid` y layout vertical

### Facturas (`features/facturas/facturas-detail/`)

- Botón "Link de pago" (TodoPago) visible si factura no está pagada
- Card de estado del pago con link copiable y botones abrir/copiar
- Polling cada 10s para detectar pago completado automáticamente
- Tabla de transacciones debajo de la ficha

### Integración TodoPago

- **Backend**: `config/todopago.js`, `services/todopago.service.js`, `controllers/todopagoController.js`, `routes/todopagoRoutes.js`
- **Frontend**: `services/todopago.service.ts`, modelo `TransaccionPago`
- Sin credenciales funciona en **modo simulación** (sandbox)
- Para producción: configurar `TODOPAGO_MERCHANT_ID`, `TODOPAGO_API_KEY`, `TODOPAGO_SECURITY` en `.env`

### Dashboard (`features/dashboard/`)

- Banner con gradiente + 4 botones de acción rápida (Cobrar Factura, Nueva Lectura, Registrar Gasto, Nuevo Abonado)
- 4 KPIs: Total Recaudado (Mes), Abonados Activos, % Mora, Egresos del Mes
- Gráfico de barras con desglose por concepto (Agua Base, Excedente, Alcantarillado, Mora, Multas)
- Panel de alertas: consumos atípicos, órdenes de corte pendientes
- Layout responsive (4→2→1 columna)

## Mejoras Mobile / Accesibilidad

- Sidebar: slide-out overlay en móvil (< 768px), backdrop + botón cerrar
- Layout: padding responsive (2rem→1rem→0.75rem)
- Tablas: scroll horizontal automático, font-size reducido en sm
- Touch: todos los inputs/buttons tienen min-height 44px (estándar WCAG)
- Pestañas de filtro con scroll horizontal en móvil
- Cards en abonados-list responsive (auto-fill, minmax(360px,1fr))

## Comandos recurrentes

- Para validar compilación: `npm run build`
- Para pruebas: `npm test`
- Lint: `ng lint` (si está configurado)
- Backend: `npm run dev` (en `../backend/`)
