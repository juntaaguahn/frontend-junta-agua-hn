import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { AuthService } from '../../core/services/auth.service';

interface AccesoConfig {
  titulo: string;
  descripcion: string;
  icono: string;
  ruta: string;
  severity: 'info' | 'warn' | 'success' | 'secondary';
}

@Component({
  selector: 'app-configuracion',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule],
  templateUrl: './configuracion.html',
  styleUrl: './configuracion.scss',
})
export class Configuracion {
  private auth = inject(AuthService);
  private router = inject(Router);
  private msgs = inject(MessageService);

  readonly rol = this.auth.rol;
  nombreOrg = signal('Junta de Agua Potable');
  cargandoPassword = signal(false);

  readonly accesos: AccesoConfig[] = [
    {
      titulo: 'Tarifas y cobros',
      descripcion: 'Cargo fijo, excedente por m³, alcantarillado, mora y multas',
      icono: 'pi pi-tags',
      ruta: '/tarifas',
      severity: 'info',
    },
    {
      titulo: 'Usuarios del sistema',
      descripcion: 'Crear y gestionar administradores, cajeros y lecturadores',
      icono: 'pi pi-user-edit',
      ruta: '/usuarios',
      severity: 'warn',
    },
    {
      titulo: 'Abonados',
      descripcion: 'Administrar los clientes del servicio de agua',
      icono: 'pi pi-users',
      ruta: '/abonados',
      severity: 'success',
    },
    {
      titulo: 'Movimientos de caja',
      descripcion: 'Consultar ingresos, egresos y registrar nuevos egresos',
      icono: 'pi pi-wallet',
      ruta: '/caja',
      severity: 'secondary',
    },
  ];

  ir(ruta: string) {
    this.router.navigate([ruta]);
  }

  cambiarPassword(actual: string, nueva: string) {
    if (!actual || !nueva) {
      this.msgs.add({ severity: 'warn', summary: 'Atención', detail: 'Completa ambos campos' });
      return;
    }
    if (nueva.length < 6) {
      this.msgs.add({ severity: 'warn', summary: 'Atención', detail: 'La nueva contraseña debe tener al menos 6 caracteres' });
      return;
    }
    this.cargandoPassword.set(true);
    this.auth.changePassword(actual, nueva).subscribe({
      next: () => {
        this.cargandoPassword.set(false);
        this.msgs.add({ severity: 'success', summary: 'Contraseña actualizada' });
      },
      error: () => {
        this.cargandoPassword.set(false);
        this.msgs.add({ severity: 'error', summary: 'Error', detail: 'Contraseña actual incorrecta' });
      },
    });
  }
}
