export type GrupoParametro = "PLAZOS" | "META_MATCH" | "UMBRALES_ALERTA" | "LIMITES_SLA";
export const GRUPOS_PARAMETRO: GrupoParametro[] = [
  "PLAZOS",
  "META_MATCH",
  "UMBRALES_ALERTA",
  "LIMITES_SLA",
];
export const ETIQUETAS_GRUPO_PARAMETRO: Record<GrupoParametro, string> = {
  PLAZOS: "Plazos de presentación",
  META_MATCH: "Meta de Match online vs. compensación",
  UMBRALES_ALERTA: "Umbrales de alerta",
  LIMITES_SLA: "Límites de SLA por proceso",
};

export interface Parametro {
  clave: string;
  grupo: GrupoParametro;
  nombre: string;
  unidad: "días" | "%" | "min";
  valor: number;
  minimo: number;
  maximo: number;
}

export type AlcanceEdicion = "TODOS" | "UMBRALES_ALERTA" | "NINGUNO";

export const puedeEditarGrupo = (alcance: AlcanceEdicion, grupo: GrupoParametro): boolean =>
  alcance === "TODOS" || (alcance === "UMBRALES_ALERTA" && grupo === "UMBRALES_ALERTA");

export const valorValido = (p: Parametro, valor: number): boolean =>
  Number.isFinite(valor) && valor >= p.minimo && valor <= p.maximo;
