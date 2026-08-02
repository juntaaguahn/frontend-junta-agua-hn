import { Injectable } from "@angular/core";

@Injectable({ providedIn: 'root' })
export class CorrelativoService {

  generarCodigo(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Los meses van de 0 a 11
  const day = String(date.getDate()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  const ms = String(date.getMilliseconds()).padStart(3, '0');

  return `${year}${month}${day}${seconds}${ms}`;
  }

}
