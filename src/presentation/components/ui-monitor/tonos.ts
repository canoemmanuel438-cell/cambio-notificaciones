import type { EstadoAlerta, Severidad } from "@/domain/entities/Alerta";
import type { EstadoSLA } from "@/domain/entities/ProcesoSLA";
import type { EstatusTransaccion } from "@/domain/entities/Transaccion";
import type { Tono } from "./Monitor";

export const TONO_SEVERIDAD: Record<Severidad, Tono> = {
  ALTA: "rojo",
  MEDIA: "ambar",
  BAJA: "gris",
};
export const TONO_ESTADO_ALERTA: Record<EstadoAlerta, Tono> = {
  ABIERTA: "rojo",
  EN_ATENCION: "ambar",
  CERRADA: "gris",
};
export const TONO_ESTATUS: Record<EstatusTransaccion, Tono> = {
  MATCH: "verde",
  NO_MATCH: "rojo",
  EN_PROCESO: "gris",
  RECHAZADA: "rojo",
  VENCIDA: "rojo",
};
export const TONO_SLA: Record<EstadoSLA, Tono> = {
  EN_TIEMPO: "verde",
  EN_RIESGO: "ambar",
  INCUMPLIDO: "rojo",
  PROGRAMADO: "gris",
  SIN_RECIBIR: "rojo",
};
