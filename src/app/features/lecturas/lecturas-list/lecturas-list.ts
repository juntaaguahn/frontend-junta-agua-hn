import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { InputIconModule } from 'primeng/inputicon';
import { IconFieldModule } from 'primeng/iconfield';
import { MessageService } from 'primeng/api';
import { LecturasService } from '../../../core/services/lecturas.service';
import { AbonadosService } from '../../../core/services/abonados.service';
import { SectoresService } from '../../../core/services/sectores.service';
import { Lectura } from '../../../core/models';

@Component({
  selector: 'app-lecturas-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    SelectModule,
    TagModule,
    SkeletonModule,
    TooltipModule,
    ToastModule,
    InputIconModule,
    IconFieldModule,
  ],
  templateUrl: './lecturas-list.html',
  styleUrl: './lecturas-list.scss',
  providers: [MessageService],
})
export class LecturasList implements OnInit {
  private service = inject(LecturasService);
  private abonadosService = inject(AbonadosService);
  private sectoresService = inject(SectoresService);
  private router = inject(Router);
  private msgs = inject(MessageService);

  data = signal<Lectura[]>([]);
  cargando = signal(false);
  sectorFiltro = signal<string | null>(null);
  sectores = signal<string[]>([]);
  abonadoFiltro = signal<number | null>(null);
  abonadosOpts = signal<{ id: number; nombre: string; codigo: string }[]>([]);
  periodos = signal<string[]>([]);
  periodoFiltro = signal<string | null>(null);

  ngOnInit() {
    this.load();
    this.sectoresService.list().subscribe((s) =>
      this.sectores.set(
        s
          .filter((x) => x.status === 'Y')
          .map((x) => x.descripcion)
          .sort((a, b) => a.localeCompare(b)),
      ),
    );
    this.abonadosService.list({ limit: 10000 }).subscribe((res) => {
      this.abonadosOpts.set(
        res.data
          .filter((a) => a.id != null)
          .map((a) => ({
            id: a.id!,
            nombre: a.nombre,
            codigo: a.codigo,
          }))
          .sort((a, b) => a.nombre.localeCompare(b.nombre)),
      );
    });
  }

  load() {
    this.cargando.set(true);
    this.service
      .list({
        periodo: this.periodoFiltro() || undefined,
        facturada: false,
        limit: 100,
      })
      .subscribe({
        next: (res) => {
          this.data.set(res.data);
          this.cargando.set(false);
        },
        error: () => {
          this.cargando.set(false);
          this.msgs.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudieron cargar las lecturas',
          });
        },
      });
  }

  lecturasFiltradas = computed(() => {
    let items = this.data();
    if (this.sectorFiltro()) {
      items = items.filter((l) => l.sector === this.sectorFiltro());
    }
    if (this.abonadoFiltro()) {
      items = items.filter((l) => l.abonado_id === this.abonadoFiltro());
    }
    return items;
  });

  statusLectura(l: Lectura): 'registrado' | 'pendiente' | 'atipico' {
    if (l.lectura_actual && l.consumo_m3 && l.consumo_m3 > 80) return 'atipico';
    if (!l.lectura_actual) return 'pendiente';
    return 'registrado';
  }

  statusLabel(status: string): string {
    switch (status) {
      case 'registrado':
        return 'Registrado';
      case 'pendiente':
        return 'Pendiente';
      case 'atipico':
        return 'Atípico';
      default:
        return '';
    }
  }

  statusIcon(status: string): string {
    switch (status) {
      case 'registrado':
        return 'pi pi-check-circle';
      case 'pendiente':
        return 'pi pi-clock';
      case 'atipico':
        return 'pi pi-exclamation-triangle';
      default:
        return 'pi pi-circle';
    }
  }

  statusClass(status: string): string {
    switch (status) {
      case 'registrado':
        return 'status-ok';
      case 'pendiente':
        return 'status-pending';
      case 'atipico':
        return 'status-warn';
      default:
        return '';
    }
  }

  irALectura(abonadoId?: number) {
    const params = abonadoId ? { queryParams: { abonado_id: abonadoId } } : undefined;
    this.router.navigate(['/lecturas', 'nuevo'], params);
  }

  verLectura(id?: number) {
    if (!id) return;
    this.router.navigate(['/lecturas', id]);
  }
}
