import type { GrupoParametro, Parametro } from "@/domain/entities/Parametros";
import type { ParametroRaw } from "@/infrastructure/mock/data/generador";

const GRUPOS: Record<ParametroRaw["group"], GrupoParametro> = {
  deadline: "PLAZOS",
  match_goal: "META_MATCH",
  alert_threshold: "UMBRALES_ALERTA",
  sla_limit: "LIMITES_SLA",
};
const UNIDADES: Record<ParametroRaw["unit"], Parametro["unidad"]> = {
  days: "días",
  pct: "%",
  min: "min",
};

export const ParametroMapper = {
  desdeRaw(raw: ParametroRaw): Parametro {
    return {
      clave: raw.key,
      grupo: GRUPOS[raw.group],
      nombre: raw.label,
      unidad: UNIDADES[raw.unit],
      valor: raw.value,
      minimo: raw.min,
      maximo: raw.max,
    };
  },
};
