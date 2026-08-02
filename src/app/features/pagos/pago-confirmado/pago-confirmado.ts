import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-pago-confirmado',
  standalone: true,
  imports: [CommonModule, ButtonModule],
  template: `
    <section
      class="page"
      style="display: flex; justify-content: center; align-items: center; min-height: 60vh;"
    >
      <div class="card" style="text-align: center; padding: 2rem; max-width: 480px;">
        @if (procesando()) {
          <i class="pi pi-spin pi-spinner" style="font-size: 3rem; color: #3b82f6"></i>
          <h2>Procesando pago…</h2>
          <p>Por favor espera mientras confirmamos tu pago.</p>
        } @else if (exito()) {
          <i class="pi pi-check-circle" style="font-size: 3rem; color: #16a34a"></i>
          <h2>¡Pago confirmado!</h2>
          <p>Tu pago ha sido procesado correctamente.</p>
          <p-button label="Ir al inicio" icon="pi pi-home" (onClick)="irAlInicio()" />
        } @else {
          <i class="pi pi-times-circle" style="font-size: 3rem; color: #dc2626"></i>
          <h2>Error en el pago</h2>
          <p>{{ mensajeError() || 'No se pudo procesar el pago. Intenta de nuevo.' }}</p>
          <p-button label="Volver al inicio" icon="pi pi-home" (onClick)="irAlInicio()" />
        }
      </div>
    </section>
  `,
})
export class PagoConfirmado implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private http = inject(HttpClient);

  procesando = signal(true);
  exito = signal(false);
  mensajeError = signal('');

  ngOnInit() {
    const answerKey = this.route.snapshot.queryParamMap.get('Answer');
    const order = this.route.snapshot.queryParamMap.get('Order');

    if (!answerKey || !order) {
      this.procesando.set(false);
      this.mensajeError.set('No se recibieron los datos de confirmación del pago.');
      return;
    }

    this.http
      .post<any>(`${environment.apiUrl}/todopago/confirmar`, {
        PublicRequestKey: answerKey,
        AnswerKey: answerKey,
        Order: order,
      })
      .subscribe({
        next: (res) => {
          this.procesando.set(false);
          this.exito.set(res.status === 'completed');
          if (res.status !== 'completed') {
            this.mensajeError.set(`Estado del pago: ${res.status}`);
          }
        },
        error: (err) => {
          this.procesando.set(false);
          this.mensajeError.set(err.error?.error || 'Error al confirmar el pago.');
        },
      });
  }

  irAlInicio() {
    this.router.navigate(['/pagos']);
  }
}
