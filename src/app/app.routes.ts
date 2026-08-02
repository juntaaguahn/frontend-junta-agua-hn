import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { rolGuard } from './core/guards/rol.guard';
import { MainLayout } from './layout/main-layout/main-layout';

export const adminRoutes = rolGuard('admin');

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
  },

  {
    path: '',
    component: MainLayout,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'chat',
        loadComponent: () => import('./features/chat/chat/chat').then((m) => m.Chat),
      },
      {
        path: 'abonados',
        loadComponent: () =>
          import('./features/abonados/abonados-list/abonados-list').then((m) => m.AbonadosList),
      },
      {
        path: 'abonados/nuevo',
        loadComponent: () =>
          import('./features/abonados/abonado-form/abonado-form').then((m) => m.AbonadoForm),
      },
      {
        path: 'abonados/:id/editar',
        loadComponent: () =>
          import('./features/abonados/abonado-form/abonado-form').then((m) => m.AbonadoForm),
      },
      {
        path: 'abonados/:id',
        loadComponent: () =>
          import('./features/abonados/abonado-detail/abonado-detail').then((m) => m.AbonadoDetail),
      },
      {
        path: 'tarifas',
        canActivate: [adminRoutes],
        loadComponent: () =>
          import('./features/tarifas/tarifas-list/tarifas-list').then((m) => m.TarifasList),
      },
      {
        path: 'tarifas/nuevo',
        canActivate: [adminRoutes],
        loadComponent: () =>
          import('./features/tarifas/tarifa-form/tarifa-form').then((m) => m.TarifaForm),
      },
      {
        path: 'tarifas/:id/editar',
        canActivate: [adminRoutes],
        loadComponent: () =>
          import('./features/tarifas/tarifa-form/tarifa-form').then((m) => m.TarifaForm),
      },
      {
        path: 'tarifas/:id',
        canActivate: [adminRoutes],
        loadComponent: () =>
          import('./features/tarifas/tarifa-detail/tarifa-detail').then((m) => m.TarifaDetail),
      },
      {
        path: 'tegresos',
        canActivate: [adminRoutes],
        loadComponent: () =>
          import('./features/tegresos/tegresos-list/tegresos-list').then((m) => m.TegresosList),
      },
      {
        path: 'tegresos/nuevo',
        canActivate: [adminRoutes],
        loadComponent: () =>
          import('./features/tegresos/tegreso-form/tegreso-form').then((m) => m.TegresoForm),
      },
      {
        path: 'tegresos/:id/editar',
        canActivate: [adminRoutes],
        loadComponent: () =>
          import('./features/tegresos/tegreso-form/tegreso-form').then((m) => m.TegresoForm),
      },
      {
        path: 'tegresos/:id',
        canActivate: [adminRoutes],
        loadComponent: () =>
          import('./features/tegresos/tegreso-detail/tegreso-detail').then((m) => m.TegresoDetail),
      },
      {
        path: 'usuarios',
        canActivate: [adminRoutes],
        loadComponent: () =>
          import('./features/usuarios/usuarios-list/usuarios-list').then((m) => m.UsuariosList),
      },
      {
        path: 'usuarios/nuevo',
        canActivate: [adminRoutes],
        loadComponent: () =>
          import('./features/usuarios/usuario-form/usuario-form').then((m) => m.UsuarioForm),
      },
      {
        path: 'usuarios/:id/editar',
        canActivate: [adminRoutes],
        loadComponent: () =>
          import('./features/usuarios/usuario-form/usuario-form').then((m) => m.UsuarioForm),
      },
      {
        path: 'lecturas',
        loadComponent: () =>
          import('./features/lecturas/lecturas-list/lecturas-list').then((m) => m.LecturasList),
      },
      {
        path: 'lecturas/nuevo',
        loadComponent: () =>
          import('./features/lecturas/lecturas-form/lecturas-form').then((m) => m.LecturasForm),
      },
      {
        path: 'lecturas/:id/editar',
        loadComponent: () =>
          import('./features/lecturas/lecturas-form/lecturas-form').then((m) => m.LecturasForm),
      },
      {
        path: 'lecturas/:id',
        loadComponent: () =>
          import('./features/lecturas/lecturas-detail/lecturas-detail').then(
            (m) => m.LecturasDetail,
          ),
      },
      {
        path: 'facturas',
        loadComponent: () =>
          import('./features/facturas/facturas-list/facturas-list').then((m) => m.FacturasList),
      },
      {
        path: 'facturas/nuevo',
        loadComponent: () =>
          import('./features/facturas/facturas-form/facturas-form').then((m) => m.FacturasForm),
      },
      {
        path: 'facturas/:id/cobro',
        loadComponent: () =>
          import('./features/facturas/cobro-rapido/cobro-rapido').then((m) => m.CobroRapido),
      },
      {
        path: 'facturas/:id/editar',
        loadComponent: () =>
          import('./features/facturas/facturas-form/facturas-form').then((m) => m.FacturasForm),
      },
      {
        path: 'facturas/:id',
        loadComponent: () =>
          import('./features/facturas/facturas-detail/facturas-detail').then(
            (m) => m.FacturasDetail,
          ),
      },
      {
        path: 'cobro',
        loadComponent: () =>
          import('./features/facturas/cobro-rapido/cobro-landing').then((m) => m.CobroLanding),
      },
      {
        path: 'pagos',
        loadComponent: () =>
          import('./features/pagos/pagos-list/pagos-list').then((m) => m.PagosList),
      },
      {
        path: 'pagos/nuevo',
        loadComponent: () =>
          import('./features/pagos/pagos-form/pagos-form').then((m) => m.PagosForm),
      },
      {
        path: 'pagos/confirmado',
        loadComponent: () =>
          import('./features/pagos/pago-confirmado/pago-confirmado').then((m) => m.PagoConfirmado),
      },
      {
        path: 'pagos/error',
        redirectTo: 'pagos/confirmado',
      },
      {
        path: 'pagos/:id',
        loadComponent: () =>
          import('./features/pagos/pagos-detail/pagos-detail').then((m) => m.PagosDetail),
      },
      {
        path: 'caja',
        loadComponent: () => import('./features/caja/caja-list/caja-list').then((m) => m.CajaList),
      },
      {
        path: 'ordenes',
        loadComponent: () =>
          import('./features/ordenes/ordenes-list/ordenes-list').then((m) => m.OrdenesList),
      },
      {
        path: 'ordenes/nuevo',
        loadComponent: () =>
          import('./features/ordenes/orden-form/orden-form').then((m) => m.OrdenForm),
      },
      {
        path: 'ordenes/:id',
        loadComponent: () =>
          import('./features/ordenes/orden-detail/orden-detail').then((m) => m.OrdenDetail),
      },
      {
        path: 'reportes/resumen',
        loadComponent: () =>
          import('./features/reportes/reporte-resumen/reporte-resumen').then(
            (m) => m.ReporteResumen,
          ),
      },
      {
        path: 'reportes/recaudo',
        loadComponent: () =>
          import('./features/reportes/reporte-recaudo/reporte-recaudo').then(
            (m) => m.ReporteRecaudo,
          ),
      },
      {
        path: 'reportes/morosidad',
        loadComponent: () =>
          import('./features/reportes/reporte-morosidad/reporte-morosidad').then(
            (m) => m.ReporteMorosidad,
          ),
      },
      {
        path: 'configuracion',
        canActivate: [adminRoutes],
        loadComponent: () =>
          import('./features/configuracion/configuracion').then((m) => m.Configuracion),
      },
      {
        path: 'sectores',
        canActivate: [adminRoutes],
        loadComponent: () =>
          import('./features/configuracion/sectores-list/sectores-list').then(
            (m) => m.SectoresList,
          ),
      },
      {
        path: 'parametros',
        canActivate: [adminRoutes],
        loadComponent: () =>
          import('./features/configuracion/parametros-list/parametros-list').then(
            (m) => m.ParametrosList,
          ),
      },
      {
        path: 'periodos',
        canActivate: [adminRoutes],
        loadComponent: () =>
          import('./features/configuracion/periodos-list/periodos-list').then(
            (m) => m.PeriodosList,
          ),
      },
      {
        path: 'periodos/nuevo',
        canActivate: [adminRoutes],
        loadComponent: () =>
          import('./features/configuracion/periodo-form/periodo-form').then((m) => m.PeriodoForm),
      },
      {
        path: 'periodos/:id/editar',
        canActivate: [adminRoutes],
        loadComponent: () =>
          import('./features/configuracion/periodo-form/periodo-form').then((m) => m.PeriodoForm),
      },
      {
        path: 'usuarios-periodo',
        canActivate: [adminRoutes],
        loadComponent: () =>
          import('./features/configuracion/usuarios-periodo/usuarios-periodo').then(
            (m) => m.UsuariosPeriodo,
          ),
      },
      {
        path: 'usuarios-periodo/nuevo',
        canActivate: [adminRoutes],
        loadComponent: () =>
          import('./features/configuracion/usuarios-periodo-form/usuarios-periodo-form').then(
            (m) => m.UsuariosPeriodoForm,
          ),
      },
      {
        path: 'perfil/cambiar-password',
        loadComponent: () =>
          import('./features/auth/cambiar-password/cambiar-password').then(
            (m) => m.CambiarPasswordComponent,
          ),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
