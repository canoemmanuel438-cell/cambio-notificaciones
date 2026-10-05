import type { RolId } from "./Rol";

export type TipoEvento =
  | "Inicio de sesión"
  | "Cambio de rol"
  | "Cierre de sesión"
  | "Navegación"
  | "Búsqueda"
  | "Apertura de ficha"
  | "Consulta de detalle"
  | "Descarga"
  | "Cambio de estado de alerta"
  | "Cambio de parámetro";

export interface EventoBitacora {
  id: string;
  fecha: string;
  rol: RolId;
  evento: TipoEvento;
  detalle: string;
}

export type NuevoEventoBitacora = Omit<EventoBitacora, "id">;

export type FuenteArchivo = "TLF" | "STATS" | "SETL" | "COMP_POS" | "TEF" | "EPAPE";

export interface RecepcionArchivo {
  fuente: FuenteArchivo;
  fechaDatos: string; // YYYY-MM-DD
  recibido: boolean;
}

export interface EntidadCatalogo {
  id: string;
  nombre: string;
}

export interface Catalogos {
  adquirentes: EntidadCatalogo[];
  emisores: EntidadCatalogo[];
}

export interface Sesion {
  rolActivo: RolId | null;
  ultimoRol: RolId | null;
}
