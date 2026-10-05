/** Catálogos de administración del visor: layouts de ingesta, modelo semántico y controles de seguridad. */

export type CanalLayout = "POS" | "ATM" | "POS y ATM";

export interface Layout {
  id: string;
  nombre: string;
  fuente: string;
  canal: CanalLayout;
  version: number;
  campos: number;
  fiids: string[];
  activo: boolean;
  ultimaModificacion: string; // ISO
}

export interface FiltrosLayouts {
  texto?: string | undefined;
  canal?: CanalLayout | undefined;
  activo?: boolean | undefined;
}

export interface ResumenLayouts {
  total: number;
  activos: number;
  inactivos: number;
  fiids: number;
  cambios30Dias: number;
}

export interface MetricaSemantica {
  nombre: string;
  clave: string;
  definicion: string;
  tipo: "count" | "sum" | "number";
  view: string;
  seUsaEn: string[];
}

export interface ModeloSemantico {
  conexion: { estado: "CONECTADA" | "DESCONECTADA"; destino: string };
  views: number;
  explores: number;
  vistasMaterializadas: number;
  ultimaActualizacion: string; // ISO
  metricas: MetricaSemantica[];
}

export interface ControlSeguridad {
  control: string;
  descripcion: string;
  capa: string;
  activo: boolean;
}

export interface AmbienteSeguridad {
  ambiente: string;
  datos: string;
  acceso: string;
  proyecto: string;
}

export interface PosturaSeguridad {
  controles: ControlSeguridad[];
  ambientes: AmbienteSeguridad[];
  autenticacion: { proveedor: string; protocolo: string };
}

/** Coincidencia de un layout con los filtros (texto busca en nombre, fuente, ID y FIIDs). */
export const coincideLayout = (l: Layout, f: FiltrosLayouts): boolean => {
  if (f.canal && l.canal !== f.canal) return false;
  if (f.activo !== undefined && l.activo !== f.activo) return false;
  const t = f.texto?.trim().toLowerCase();
  if (!t) return true;
  return [l.id, l.nombre, l.fuente, ...l.fiids].some((v) => v.toLowerCase().includes(t));
};
