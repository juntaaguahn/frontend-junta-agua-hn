import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { PasswordModule } from 'primeng/password';
import { MessageService } from 'primeng/api';
import { UsuariosService } from '../../../core/services/usuarios.service';
import { NavegacionService } from '../../../core/services/navegacion.service';
import type { Rol, EstadoUsuario } from '../../../core/models';

@Component({
  selector: 'app-usuario-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    TagModule,
    PasswordModule,
  ],
  templateUrl: './usuario-form.html',
  styleUrl: './usuario-form.scss',
})
export class UsuarioForm implements OnInit {
  private fb = inject(FormBuilder);
  private service = inject(UsuariosService);
  private route = inject(ActivatedRoute);
  private msgs = inject(MessageService);
  private nav = inject(NavegacionService);

  esEdicion = signal(false);
  cargando = signal(false);
  guardando = signal(false);
  titulo = signal('Nuevo usuario');
  errorPassword = signal('');

  readonly roles: { label: string; value: Rol }[] = [
    { label: 'Admin', value: 'admin' },
    { label: 'Cajero', value: 'cajero' },
    { label: 'Lecturista', value: 'lecturador' },
  ];

  readonly estados: { label: string; value: EstadoUsuario }[] = [
    { label: 'Activo', value: 'activo' },
    { label: 'Inactivo', value: 'inactivo' },
  ];

  readonly rolSeverity: Record<string, 'info' | 'warn' | 'success' | 'secondary'> = {
    admin: 'warn',
    cajero: 'info',
    lecturador: 'success',
  };

  form = this.fb.group({
    nombre: ['', [Validators.required, Validators.maxLength(120)]],
    username: ['', [Validators.required, Validators.maxLength(60)]],
    email: ['', [Validators.email, Validators.maxLength(120)]],
    password: [''],
    rol: ['lecturador' as Rol, Validators.required],
    estado: ['activo' as EstadoUsuario, Validators.required],
  });

  readonly preview = computed(() => ({
    nombre: this.form.get('nombre')?.value ?? '',
    username: this.form.get('username')?.value ?? '',
    rol: this.form.get('rol')?.value as Rol,
    estado: this.form.get('estado')?.value as EstadoUsuario,
  }));

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.esEdicion.set(true);
      this.titulo.set('Editar usuario');
      this.cargando.set(true);
      this.service.get(+id).subscribe({
        next: (u) => {
          this.form.patchValue({
            nombre: u.nombre,
            username: u.username,
            email: u.email,
            rol: u.rol,
            estado: u.estado,
          });
          this.cargando.set(false);
        },
        error: () => {
          this.cargando.set(false);
          this.msgs.add({ severity: 'error', summary: 'Error', detail: 'Usuario no encontrado' });
          this.volver();
        },
      });
    }
  }

  validarPassword(pw: string): boolean {
    if (!pw && !this.esEdicion()) {
      this.errorPassword.set('La contraseña es requerida');
      return false;
    }
    if (!pw) {
      this.errorPassword.set('');
      return true;
    }
    if (pw.length < 8) {
      this.errorPassword.set('Debe tener al menos 8 caracteres');
      return false;
    }
    if (!/[A-Z]/.test(pw)) {
      this.errorPassword.set('Debe contener una letra mayúscula');
      return false;
    }
    if (!/[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\;'/]/.test(pw)) {
      this.errorPassword.set('Debe contener un carácter especial');
      return false;
    }
    this.errorPassword.set('');
    return true;
  }

  guardar() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    if (!this.validarPassword(raw.password || '')) return;

    const payload: any = {
      nombre: raw.nombre,
      username: raw.username,
      email: raw.email || undefined,
      rol: raw.rol,
      estado: raw.estado,
    };
    if (raw.password) payload.password = raw.password;

    this.guardando.set(true);
    const op = this.esEdicion()
      ? this.service.update(+this.route.snapshot.paramMap.get('id')!, payload)
      : this.service.create(payload);

    op.subscribe({
      next: () => {
        this.guardando.set(false);
        this.msgs.add({
          severity: 'success',
          summary: 'Guardado',
          detail: this.esEdicion() ? 'Usuario actualizado' : 'Usuario creado correctamente',
        });
        this.volver();
      },
      error: (err) => {
        this.guardando.set(false);
        const detalle = err.status === 409 ? err.error?.error : 'No se pudo guardar el usuario';
        this.msgs.add({ severity: 'error', summary: 'Error', detail: detalle });
      },
    });
  }

  volver() {
    this.nav.volver(['/usuarios']);
  }

  invalid(ctrl: string): boolean {
    const c = this.form.get(ctrl);
    return !!c && c.invalid && (c.dirty || c.touched);
  }
}
