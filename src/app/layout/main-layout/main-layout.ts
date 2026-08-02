import { Component, DestroyRef, inject, signal, computed } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { SplitButtonModule } from 'primeng/splitbutton';
import { AvatarModule } from 'primeng/avatar';
import { PanelMenuModule } from 'primeng/panelmenu';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MenuItem } from 'primeng/api';
import { AuthService } from '../../core/services/auth.service';
import { OfflineService } from '../../core/services/offline.service';
import { PeriodoService } from '../../core/services/periodo.service';
import { AppParamsService } from '../../core/services/app-params.service';
import { OfflineBanner } from '../offline-banner/offline-banner';
import { ChatWidget } from '../../features/chat/chat-widget/chat-widget';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    ButtonModule,
    AvatarModule,
    PanelMenuModule,
    ToastModule,
    ConfirmDialogModule,
    SplitButtonModule,
    OfflineBanner,
    ChatWidget,
  ],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.scss',
})
export class MainLayout {
  private auth = inject(AuthService);
  private confirm = inject(ConfirmationService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private offline = inject(OfflineService);
  private periodo = inject(PeriodoService);
  readonly params = inject(AppParamsService);

  mobileSidebarOpen = signal(false);
  sidebarHidden = signal(false);
  pinned = signal(false);

  constructor() {
    this.destroyRef.onDestroy(() =>
      this.router.events.subscribe((event) => {
        if (event instanceof NavigationEnd && window.innerWidth <= 768) {
          this.mobileSidebarOpen.set(false);
        }
      }),
    );
    void this.offline.init();
    this.periodo.cargarDesdeSesion();
    this.params.cargar();
  }

  readonly user = this.auth.user;
  readonly rol = this.auth.rol;

  menuItems = computed<MenuItem[]>(() => {
    const r = this.rol();
    const items: MenuItem[] = [
      { label: 'Panel de Control', icon: 'pi pi-th-large', routerLink: ['/dashboard'] },
      { label: 'Abonados', icon: 'pi pi-users', routerLink: ['/abonados'], expanded: false },
    ];
    items.push(
      { label: 'Lecturas', icon: 'pi pi-calculator', routerLink: ['/lecturas'] },
      { label: 'Facturación', icon: 'pi pi-file', routerLink: ['/facturas'] },
      { label: 'Pagos', icon: 'pi pi-wallet', routerLink: ['/pagos'] },
      {
        label: 'Cobro Rápido',
        icon: 'pi pi-bolt',
        routerLink: ['/cobro'],
        title: 'Cobrar una factura pendiente de forma rápida',
      },
      { label: 'Caja', icon: 'pi pi-box', routerLink: ['/caja'] },
      { label: 'Órdenes Corte', icon: 'pi pi-ban', routerLink: ['/ordenes'] },
    );
    if (r === 'admin' || r === 'cajero') {
      items.push({
        label: 'Reportes',
        icon: 'pi pi-chart-bar',
        items: [
          {
            label: 'Resumen Financiero',
            icon: 'pi pi-chart-pie',
            routerLink: ['/reportes/resumen'],
          },
          { label: 'Facturado', icon: 'pi pi-dollar', routerLink: ['/reportes/recaudo'] },
          {
            label: 'Morosidad',
            title: 'Abonados con facturas vencidas',
            icon: 'pi pi-exclamation-circle',
            routerLink: ['/reportes/morosidad'],
          },
        ],
      });
    }
    if (r === 'admin') {
      items.push({
        label: 'Configuración',
        icon: 'pi pi-cog',
        items: [
          { label: 'Usuarios', icon: 'pi pi-user-edit', routerLink: ['/usuarios'] },
          { label: 'Tarifas', icon: 'pi pi-tag', routerLink: ['/tarifas'] },
          { label: 'Tipos de Egreso', icon: 'pi pi-minus-circle', routerLink: ['/tegresos'] },
          { label: 'Sectores', icon: 'pi pi-map-marker', routerLink: ['/sectores'] },
          { label: 'Parámetros', icon: 'pi pi-sliders-h', routerLink: ['/parametros'] },
          { label: 'Períodos', icon: 'pi pi-calendar', routerLink: ['/periodos'] },
          {
            label: 'Períodos por Usuario',
            icon: 'pi pi-user-cog',
            routerLink: ['/usuarios-periodo'],
          },
        ],
      });
    }

    return items;
  });

  userMenuItems: MenuItem[] = [
    { label: 'Cambiar Contraseña', icon: 'pi pi-key', routerLink: ['/perfil/cambiar-password'] },
    { separator: true },
    { label: 'Cerrar Sesión', icon: 'pi pi-sign-out', command: () => this.cerrarSesion() },
  ];

  toggleSidebar() {
    if (window.innerWidth <= 768) {
      this.mobileSidebarOpen.update((v) => !v);
      return;
    }
    this.sidebarHidden.update((v) => !v);
  }

  onMenuClick(event: MouseEvent) {
    if (window.innerWidth > 768) return;
    const target = event.target as HTMLElement;
    const esNavegacion = !!target.closest('a[href]');
    if (esNavegacion) {
      this.mobileSidebarOpen.set(false);
    }
  }

  togglePin() {
    this.pinned.update((v) => !v);
    if (this.pinned()) {
      this.sidebarHidden.set(false);
    }
  }

  get toggleIcon(): string {
    if (window.innerWidth <= 768) {
      return this.mobileSidebarOpen() ? 'pi pi-angle-left' : 'pi pi-bars';
    }
    return this.sidebarHidden() ? 'pi pi-angle-right' : 'pi pi-angle-left';
  }

  get initials(): string {
    const n = this.user()?.nombre || '';
    return n
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  cerrarSesion() {
    this.confirm.confirm({
      header: 'Cerrar sesión',
      message: '¿Estás seguro de cerrar la sesión actual?',
      icon: 'pi pi-sign-out',
      acceptLabel: 'Sí, cerrar sesión',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-text',
      accept: () => this.auth.logout(),
    });
  }
}
