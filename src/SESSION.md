# Sesión - Resumen de cambios

## 1. Reporte-resumen (dashboard asimétrico)

- Agregado "Resumen Financiero" al menú de Reportes (main-layout.ts)
- Rediseñado el componente con estilo dashboard (KPI cards con bordes, iconos coloreados, chart card con badge)
- SCSS reescrito (sin gradients ni estilos ChatGPT)
- Chart ticks corregidos de $ a L

## 2. ConfirmDialog en usuarios-list

- Reemplazado confirm() JS por p-confirmdialog con ConfirmationService
- Eliminado p-confirmdialog duplicado (usa el global del layout)

## 3. Layout - cerrar sesión con confirmación

- Creado método cerrarSesion() con ConfirmDialog
- AuthService.logout() ahora también limpia cookies

## 4. Botones facturas-detail

- Labels movidos a pTooltip, todos con [rounded]="true"
- Contenedor con display:flex; gap:0.5rem

## 5. Sidebar mobile - no se abría

- toggleSidebar() ahora detecta mobile (window.innerWidth <= 768) y alterna mobileSidebarOpen
- toggleIcon getter para icono correcto en mobile (pi-bars / pi-angle-left)

## 6. Abonados-list responsive (mobile)

- Stats bar a 1 columna en ≤480px con row-reverse (label izq, valor der)
- Cards más compactas (padding, fonts reducidos)

## 7. Lecturas-list - bug botón Nueva Lectura

- irALectura() sin argumento no navegaba por el early return
- Corregido: navega sin queryParams si no hay abonado_id

## 8. Facturas-list - p-table → p-dataview

- Reemplazado TableModule por DataViewModule
- Cards con id, período, tag estado, abonado, consumo, total, pagado, saldo, acciones

## 9. Lecturas-list - filtro por abonado

- Nuevo signal abonadoFiltro + abonadosOpts extraídos de los datos
- Select con filter=true (búsqueda por nombre/código)

## 10. Integridad referencial factura ↔ lectura

- Schema: columna factura_id en lecturas con FK
- generarMasiva: UPDATE lecturas SET factura_id = ? al crear cada factura
- createFactura: mismo UPDATE si lectura_id presente
- deleteFactura: UPDATE lecturas SET factura_id = NULL antes de borrar
- Frontend Lectura interface: agregado factura_id
- Frontend facturas-form: envía lectura_id en el payload

## 11. Facturación masiva — Bug tarifas (29/07/2026)

- Las facturas masivas se creaban con valores en 0 porque `calcularFactura()` buscaba conceptos `"agua_base"`, `"excedente"`, `"alcantarillado"` (minúscula) que no existían en BD
- Las tarifas reales del cliente son: `"Metros cubicos"` (70/m³), `"Alcantarillado"` (80 fijo), `"Tarifa fija"`, `"Gastos administrativos"`, `"Cobro por fraccion o litros de agua"`
- Se actualizó `calcularFactura()` para usar `"Metros cubicos"` y `"Alcantarillado"` directamente
- Se parametrizó `descuento_tercera_edad` como tarifa en BD (concepto: `"descuento_tercera_edad"`, valor en %, ej: 5)
- Se actualizó el seed para incluir la tarifa `descuento_tercera_edad`

## 12. pagos-form — Mejoras (30/07/2026)

- **Formato numérico**: `locale="en-US"` en monto, efectivo_recibido y cambio para separador de miles `#,####.##`
- **Validación efectivo recibido**: no puede ser negativo ni menor al monto
- **Monto solo lectura**: el campo monto ahora es `[readonly]="true"`
- **Fecha**: formato cambiado a `dd/mm/yy`
- **TodoPago**: botón "Pagar con TodoPago" al pie del formulario, alineado a la derecha, link de respuesta ocupa 90% del ancho
- **Redirección post-pago**: tanto `pagos-form` como `pago-confirmado` redirigen a `/pagos` en vez de `/pagos/:id` o `/`
