export const GRUPOS_ALERTA = [
  "Transacciones sin match",
  "Duplicados",
  "Discrepancias de importes",
  "Archivos esperados no recibidos",
  "Volúmenes anómalos",
  "Umbrales de rechazo",
  "Fallos de pipelines",
  "Retrasos de pipelines",
  "Procesos ETL",
  "Eventos técnicos",
  "Rendimiento",
  "Fallos de ejecución",
] as const;
export type GrupoAlerta = (typeof GRUPOS_ALERTA)[number];

export type Severidad = "ALTA" | "MEDIA" | "BAJA";
export const SEVERIDADES: Severidad[] = ["ALTA", "MEDIA", "BAJA"];
export const ETIQUETAS_SEVERIDAD: Record<Severidad, string> = {
  ALTA: "Alta",
  MEDIA: "Media",
  BAJA: "Baja",
};
const PESO_SEVERIDAD: Record<Severidad, number> = { ALTA: 3, MEDIA: 2, BAJA: 1 };

export type EstadoAlerta = "ABIERTA" | "EN_ATENCION" | "CERRADA";
export const ESTADOS_ALERTA: EstadoAlerta[] = ["ABIERTA", "EN_ATENCION", "CERRADA"];
export const ETIQUETAS_ESTADO_ALERTA: Record<EstadoAlerta, string> = {
  ABIERTA: "Abierta",
  EN_ATENCION: "En atención",
  CERRADA: "Cerrada",
};

export type CategoriaAlerta = "NEGOCIO" | "TECNICA";

export interface Alerta {
  id: string;
  categoria: CategoriaAlerta;
  grupo: GrupoAlerta;
  tipo: string;
  etapa: string;
  fuente: string;
  fecha: string;
  severidad: Severidad;
  estado: EstadoAlerta;
  transaccionId?: string | undefined;
}

export interface AccionAlerta {
  destino: EstadoAlerta;
  etiqueta: string;
}

const TRANSICIONES: Record<EstadoAlerta, AccionAlerta[]> = {
  ABIERTA: [
    { destino: "EN_ATENCION", etiqueta: "Tomar en seguimiento" },
    { destino: "CERRADA", etiqueta: "Cerrar alerta" },
  ],
  EN_ATENCION: [
    { destino: "CERRADA", etiqueta: "Cerrar alerta" },
    { destino: "ABIERTA", etiqueta: "Regresar a abierta" },
  ],
  CERRADA: [{ destino: "ABIERTA", etiqueta: "Reabrir alerta" }],
};

export const accionesDisponibles = (estado: EstadoAlerta): AccionAlerta[] => TRANSICIONES[estado];

export const esTransicionValida = (desde: EstadoAlerta, hacia: EstadoAlerta): boolean =>
  TRANSICIONES[desde].some((a) => a.destino === hacia);

export const severidadMaxima = (lista: Severidad[]): Severidad | undefined =>
  lista.reduce<Severidad | undefined>(
    (max, s) => (max === undefined || PESO_SEVERIDAD[s] > PESO_SEVERIDAD[max] ? s : max),
    undefined,
  );
