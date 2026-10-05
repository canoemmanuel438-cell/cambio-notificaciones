import {
  GRUPOS_ALERTA,
  type Alerta,
  type EstadoAlerta,
  type GrupoAlerta,
  type Severidad,
} from "@/domain/entities/Alerta";
import type { AlertaRaw } from "@/infrastructure/mock/data/generador";

const SEVERIDAD: Record<AlertaRaw["severity"], Severidad> = {
  HIGH: "ALTA",
  MEDIUM: "MEDIA",
  LOW: "BAJA",
};
const ESTADO: Record<AlertaRaw["status"], EstadoAlerta> = {
  OPEN: "ABIERTA",
  IN_PROGRESS: "EN_ATENCION",
  CLOSED: "CERRADA",
};

const aGrupo = (valor: string): GrupoAlerta =>
  (GRUPOS_ALERTA as readonly string[]).includes(valor)
    ? (valor as GrupoAlerta)
    : "Eventos técnicos";

export const AlertaMapper = {
  desdeRaw(raw: AlertaRaw): Alerta {
    return {
      id: raw.alert_id,
      categoria: raw.category === "BUSINESS" ? "NEGOCIO" : "TECNICA",
      grupo: aGrupo(raw.group),
      tipo: raw.type,
      etapa: raw.stage,
      fuente: raw.source,
      fecha: raw.ts,
      severidad: SEVERIDAD[raw.severity],
      estado: ESTADO[raw.status],
      transaccionId: raw.tx_id,
    };
  },

  listaDesdeRaw(raws: AlertaRaw[]): Alerta[] {
    return raws.map((raw) => AlertaMapper.desdeRaw(raw));
  },
};
