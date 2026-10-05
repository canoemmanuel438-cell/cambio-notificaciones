export type TipoSLA = "DURACION" | "HORA_LIMITE";
export type EstadoSLA = "EN_TIEMPO" | "EN_RIESGO" | "INCUMPLIDO" | "PROGRAMADO" | "SIN_RECIBIR";

export const ETIQUETAS_ESTADO_SLA: Record<EstadoSLA, string> = {
  EN_TIEMPO: "En tiempo",
  EN_RIESGO: "En riesgo",
  INCUMPLIDO: "Incumplido",
  PROGRAMADO: "Programado",
  SIN_RECIBIR: "Sin recibir",
};

export interface ProcesoSLA {
  id: string;
  nombre: string;
  tipo: TipoSLA;
  /** Duración máxima (min) o minuto del día límite. */
  limiteMin: number;
}

export interface EjecucionSLA {
  proceso: ProcesoSLA;
  fecha: string; // YYYY-MM-DD
  programadoMin: number;
  llegadaMin?: number | undefined;
  inicioMin?: number | undefined;
  finMin?: number | undefined;
  p50?: number | undefined;
  p95?: number | undefined;
}

export const UMBRAL_RIESGO = 0.85;

/** `ahoraMin` es el minuto actual si la ejecución es de hoy; null para días cerrados. */
export const estadoEjecucion = (e: EjecucionSLA, ahoraMin: number | null): EstadoSLA => {
  const limite = e.proceso.limiteMin;
  if (e.proceso.tipo === "HORA_LIMITE") {
    if (e.llegadaMin === undefined) {
      if (ahoraMin === null) return "SIN_RECIBIR";
      return ahoraMin < limite ? "PROGRAMADO" : "INCUMPLIDO";
    }
    return e.llegadaMin <= limite ? "EN_TIEMPO" : "INCUMPLIDO";
  }
  if (e.p95 === undefined) return "PROGRAMADO";
  if (e.p95 <= limite * UMBRAL_RIESGO) return "EN_TIEMPO";
  return e.p95 <= limite ? "EN_RIESGO" : "INCUMPLIDO";
};

export const desvioMinutos = (e: EjecucionSLA, ahoraMin: number | null): number => {
  const limite = e.proceso.limiteMin;
  if (e.proceso.tipo === "HORA_LIMITE") {
    if (e.llegadaMin !== undefined) return Math.max(0, e.llegadaMin - limite);
    return ahoraMin !== null && ahoraMin > limite ? ahoraMin - limite : 0;
  }
  return e.p95 !== undefined ? Math.max(0, e.p95 - limite) : 0;
};
