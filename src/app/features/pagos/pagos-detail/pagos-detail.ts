import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { SkeletonModule } from 'primeng/skeleton';
import { MessageService } from 'primeng/api';
import { PagosService } from '../../../core/services/pagos.service';
import { NavegacionService } from '../../../core/services/navegacion.service';
import { AppParamsService } from '../../../core/services/app-params.service';
import { Pago } from '../../../core/models';

@Component({
  selector: 'app-pagos-detail',
  standalone: true,
  imports: [CommonModule, DecimalPipe, ButtonModule, TagModule, SkeletonModule],
  templateUrl: './pagos-detail.html',
  styleUrl: './pagos-detail.scss',
})
export class PagosDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private service = inject(PagosService);
  private msgs = inject(MessageService);
  private nav = inject(NavegacionService);
  readonly params = inject(AppParamsService);

  cargando = signal(true);
  pago = signal<Pago | null>(null);

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.service.get(+id).subscribe({
      next: (p) => {
        this.pago.set(p);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.msgs.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar el pago' });
      },
    });
  }

  volver() {
    this.nav.volver(['/pagos']);
  }
  imprimir() {
    window.print();
  }

  metodoLabel(metodo: string): string {
    const map: Record<string, string> = {
      efectivo: 'Efectivo',
      transferencia: 'Transferencia',
      cheque: 'Cheque',
      tarjeta: 'Tarjeta',
    };
    return map[metodo] || metodo;
  }
}
