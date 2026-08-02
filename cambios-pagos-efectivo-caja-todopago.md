# Cambios realizados — Sesión 29/07/2026

## 1. Efectivo recibido y cambio en pagos

### Modelo (`frontend/src/app/core/models/index.ts`)

- `Pago.efectivo_recibido?: number`
- `Pago.cambio?: number`
- `MovimientoCaja.efectivo_recibido?: number`
- `MovimientoCaja.cambio?: number`

### Backend (`backend/src/models/schema.sql`)

- Columnas `efectivo_recibido` y `cambio` en tabla `pagos`
- Columnas `efectivo_recibido`, `cambio` y `pago_id` en tabla `caja`

### Backend (`backend/src/controllers/pagosController.js`)

- `createPago`: acepta `efectivo_recibido` y `cambio` en el body; los guarda solo si `metodo === 'efectivo'`
- Movimiento de caja también registra estos campos

### Frontend — Formulario (`pagos-form.ts`)

- `esEfectivo` signal computado del valor de `metodo`
- Controles: `efectivo_recibido` (input) y `cambio` (disabled, auto-calc)
- Watch de `metodo`: limpia campos al cambiar
- Watch de `efectivo_recibido`: calcula `cambio = max(0, efectivo_recibido - monto)`
- `guardar()`: envía los campos solo cuando `metodo === 'efectivo'`
- Template: campos visibles con `@if (esEfectivo())`

### Frontend — Detalle (`pagos-detail.html`)

- Ficha: muestra efectivo recibido y cambio si `p.metodo === 'efectivo'`
- Ticket térmico: igual, con formato compacto

---

## 2. Módulo Caja reconstruido

### Frontend — `caja-list.ts`

- Filtros: desde, hasta, tipo (ingreso/egreso)
- Cards de resumen: ingresos, egresos, saldo
- Tabla lazy paginada con columnas: ID, tipo (tag), concepto, monto, efectivo recibido, cambio, fecha, usuario
- Diálogo "Registrar egreso" con layout vertical (`p-fluid`)
- Botón "Nuevo egreso" en header

### Frontend — `caja-list.scss`

- Estilos propios para `.egreso-form` (gap 1.25rem, labels con peso 600)

### Estilos del diálogo

- Clase `p-fluid` para ancho completo de componentes PrimeNG
- Layout vertical apilado (concepto, monto, fecha)

---

## 3. Integración TodoPago (pasarela de pagos Honduras)

### Dependencias

- `axios` instalado en backend

### Backend — `backend/src/config/todopago.js`

- Config centralizada con `todopagoConfig.enabled`
- Endpoints configurables (sendAuthorizeRequest, getAuthorizeAnswer, getStatus)
- URLs de callback (URL_OK, URL_ERROR)
- Timeout configurable

### Backend — `backend/src/services/todopago.service.js`

- 3 métodos del adaptador:
  - `sendAuthorizeRequest()` — crea solicitud de pago, devuelve URL + PublicRequestKey
  - `getAuthorizeAnswer()` — confirma transacción post-pago
  - `getStatus()` — consulta estado de transacción
- Modo sandbox automático si no hay credenciales

### Backend — `backend/src/controllers/todopagoController.js`

| Endpoint                                      | Descripción                                  |
| --------------------------------------------- | -------------------------------------------- |
| `POST /api/todopago/generar-link/:factura_id` | Genera link de pago                          |
| `POST /api/todopago/confirmar`                | Callback post-pago (confirma + marca pagado) |
| `POST /api/todopago/webhook`                  | Webhook de notificación de estado            |
| `GET /api/todopago/status/:operation_id`      | Consulta estado + actualiza BD               |
| `GET /api/todopago/transacciones/:factura_id` | Lista transacciones de una factura           |
| `GET /api/todopago/config`                    | Indica si la pasarela está habilitada        |

### Backend — `backend/src/routes/todopagoRoutes.js`

- `/webhook` y `/confirmar` son públicos (sin auth)
- El resto requiere autenticación

### Backend — `backend/src/models/schema.sql`

- Tabla `transacciones_pago`: factura_id, operation_id, public_request_key, status (pending/completed/failed/expired), monto, raw_request/response

### Backend — `backend/.env.example`

- Variables `TODOPAGO_*` (MERCHANT_ID, API_KEY, SECURITY, endpoints, URLs)

### Frontend — `core/services/todopago.service.ts`

- `getConfig()`, `generarLink()`, `consultarStatus()`, `listarTransacciones()`

### Frontend — `core/models/index.ts`

- Interface `TransaccionPago`

### Frontend — `facturas-detail.ts`

- Inyecta `TodoPagoService`
- `tpEnabled`, `tpLink`, `tpOperationId`, `tpStatus`, `transacciones` signals
- `generarLinkPago()`: genera link + polling cada 10s
- `verificarStatus()`: actualiza estado, detiene polling si completed/failed/expired
- `copiarLink()`: clipboard API
- `limpiarLinkPago()`: cleanup
- `ngOnDestroy()`: limpia intervalo

### Frontend — `facturas-detail.html`

- Botón "Link de pago" en header (solo si habilitado y factura no pagada)
- Card TodoPago: estado, input con link readonly, botones copiar/abrir
- Tabla de transacciones debajo de la ficha
- Estilos `.tp-card`, `.tp-link-row`, `.tp-status`, etc.

### Frontend — `facturas-detail.scss`

- Estilos para la card de TodoPago (borde azul, fondo claro)

### Frontend — `pago-confirmado.ts`

- Página standalone que recibe `Answer` + `Order` de query params
- Llama a `POST /api/todopago/confirmar`
- Muestra éxito o error

### Frontend — `app.routes.ts`

- Ruta `/pagos/confirmado` (lazy)
- Ruta `/pagos/error` (redirect a confirmado)

---

## Para activar TodoPago en producción

1. Solicitar cuenta en [todopago.hn/tp-business](https://todopago.hn/tp-business/)
2. Configurar en `.env`:
   ```
   TODOPAGO_MERCHANT_ID=12345678
   TODOPAGO_API_KEY=tu_api_key
   TODOPAGO_SECURITY=tu_security
   PUBLIC_URL=https://tu-dominio.com
   ```
3. Ajustar `TODOPAGO_ENDPOINT_*` según la documentación que provea TodoPago HN
4. Sin credenciales, el sistema funciona en **modo simulación** (sandbox)
