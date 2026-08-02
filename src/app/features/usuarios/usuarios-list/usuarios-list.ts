import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { UsuariosService } from '../../../core/services/usuarios.service';
import { Usuario } from '../../../core/models';
import { DataViewModule } from 'primeng/dataview';
import { Router } from '@angular/router';
import { TooltipModule, Tooltip } from 'primeng/tooltip';

@Component({
  selector: 'app-usuarios-list',
  standalone: true,
  imports: [
    FormsModule,
    TagModule,
    ButtonModule,
    InputTextModule,
    DataViewModule,
    TooltipModule,
    ConfirmDialogModule,
    Tooltip,
  ],
  templateUrl: './usuarios-list.html',
  styleUrl: './usuarios-list.scss',
})
export class UsuariosList implements OnInit {
  private service = inject(UsuariosService);
  private confirm = inject(ConfirmationService);
  private router = inject(Router);

  usuarios = signal<Usuario[]>([]);
  cargando = signal(false);
  total = signal(0);
  q = signal('');

  ngOnInit() {
    this.cargar();
  }

  cargar() {
    this.cargando.set(true);
    this.service.list(this.q() || undefined).subscribe({
      next: (data) => {
        this.usuarios.set(data);
        this.total.set(data.length);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

  buscar() {
    this.cargar();
  }

  limpiar() {
    this.q.set('');
    this.cargar();
  }

  abrirNuevo() {
    this.router.navigate(['/usuarios/nuevo']);
  }

  abrirEditar(u: Usuario) {
    this.router.navigate(['/usuarios', u.id, 'editar']);
  }

  eliminar(u: Usuario) {
    if (!u.id) return;
    this.confirm.confirm({
      header: 'Eliminar usuario',
      message: `¿Estás seguro de eliminar el usuario "${u.username}"?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-text',
      accept: () => {
        this.service.delete(u.id!).subscribe({
          next: () => this.cargar(),
        });
      },
    });
  }

  getRolSeverity(rol: string) {
    switch (rol) {
      case 'admin':
        return 'info';
      case 'cajero':
        return 'warn';
      case 'lecturador':
        return 'success';
      default:
        return 'contrast';
    }
  }

  getEstadoSeverity(estado: string) {
    return estado === 'activo' ? 'success' : 'danger';
  }
}
