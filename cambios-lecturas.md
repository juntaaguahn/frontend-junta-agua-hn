# Resumen de cambios - Feature Lecturas

## 1. Modelo actualizado
**Archivo:** `src/app/core/models/index.ts`

- `lectura_anterior` pasó de opcional a **obligatorio**
- `lecturador_id` → **`usuario_id`**
- `lecturador_nombre` → **`usuario_nombre`**
- Agregado **`created_at?: string`**
- Nuevo tipo **`CreateLectura`**: solo permite `abonado_id`, `periodo`, `lectura_actual`, `fecha_lectura` y opcional `observacion`
- Nuevo tipo **`UpdateLectura`**: solo permite `periodo`, `lectura_actual`, `fecha_lectura` y `observacion`

---

## 2. Servicio actualizado
**Archivo:** `src/app/core/services/lecturas.service.ts`

- `list()` ahora acepta `q?: string` para búsqueda textual de abonado
- `create(data: CreateLectura)` — tipado estricto
- `update(id, data: UpdateLectura)` — tipado estricto

---

## 3. Componente lecturas-list (reescrito)

**Ubicación:** `src/app/features/lecturas/lecturas-list/`

### Funcionalidad
- Tabla PrimeNG con paginación lazy (10/20/50 registros)
- Skeletons durante carga
- Filtros por **abonado** (texto) y **período** (YYYY-MM)
- Botón **Nuevo** en header que navega a `/lecturas/nuevo`
- Acciones por fila: **Editar** (lápiz) y **Eliminar** (papelera con confirmación)

### Columnas de la tabla
| Columna | Encabezado |
|---|---|
| `id` | ID |
| `periodo` | Período |
| `lectura_anterior` | Lec. anterior |
| `lectura_actual` | Lec. actual |
| `consumo_m3` | Consumo m³ |
| `fecha_lectura` | Fec. ult. lectura |
| `abonado_nombre` | Abonado |
| `abonado_codigo` | Cod. Abonado |
| `usuario_nombre` | Registro por: |
| Acciones | (editar / eliminar) |

---

## 4. Componente lecturas-form (nuevo)

**Ubicación:** `src/app/features/lecturas/lecturas-form/`

### Campos del formulario
| Campo | Tipo | Validación |
|---|---|---|
| Abonado | p-select con filtro y búsqueda | Requerido |
| Período | input text (YYYY-MM) | Requerido + regex `^\d{4}-(0[1-9]\|1[0-2])$` |
| Lectura anterior | texto plano (solo lectura) | Se obtiene automáticamente al seleccionar abonado |
| Lectura actual | input number ≥ 0 | Requerido, debe ser > lectura anterior |
| Fecha de lectura | p-datepicker | Requerido |
| Observación | textarea (max 255) | Opcional |

### Validaciones clave
1. **`lectura_anterior < lectura_actual`** — validación antes de enviar
2. **Abonado + Período único** — el backend retorna 409 y se muestra mensaje
3. **En edición**: el abonado se deshabilita (no se puede cambiar)

### Flujo
1. Al seleccionar un abonado, se consulta `GET /api/lecturas?abonado_id=X&limit=1` para obtener la última lectura y calcular `lectura_anterior`
2. Al guardar, solo se envían los campos que el backend espera

---

## 5. Componente lecturas-detail (nuevo)

**Ubicación:** `src/app/features/lecturas/lecturas-detail/`

### Vista de detalle tipo ficha
- Abonado, Código abonado, Período, Lectura anterior, Lectura actual, Consumo m³, Fecha de lectura, Registrado por, Observación
- Botones: **Editar** (navega a `/lecturas/:id/editar`), **Volver** (navega a `/lecturas`)

---

## 6. Rutas agregadas
**Archivo:** `src/app/app.routes.ts`

| Ruta | Componente |
|---|---|
| `/lecturas` | LecturasList |
| `/lecturas/nuevo` | LecturasForm (creación) |
| `/lecturas/:id` | LecturasDetail |
| `/lecturas/:id/editar` | LecturasForm (edición) |

---

## Archivos creados/modificados

```
MODIFICADOS:
  src/app/core/models/index.ts
  src/app/core/services/lecturas.service.ts
  src/app/app.routes.ts
  src/app/features/lecturas/lecturas-list/lecturas-list.ts
  src/app/features/lecturas/lecturas-list/lecturas-list.html
  src/app/features/lecturas/lecturas-list/lecturas-list.scss

CREADOS:
  src/app/features/lecturas/lecturas-form/lecturas-form.ts
  src/app/features/lecturas/lecturas-form/lecturas-form.html
  src/app/features/lecturas/lecturas-form/lecturas-form.scss
  src/app/features/lecturas/lecturas-detail/lecturas-detail.ts
  src/app/features/lecturas/lecturas-detail/lecturas-detail.html
  src/app/features/lecturas/lecturas-detail/lecturas-detail.scss
```

Build verificado: **exitoso** (0 errores).
