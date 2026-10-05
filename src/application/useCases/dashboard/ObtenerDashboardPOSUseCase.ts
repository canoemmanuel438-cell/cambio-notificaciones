import { diasEnRango, type FiltrosGlobales } from "@/domain/entities/Filtros";
import {
  CIRCUITOS,
  claseTrazabilidad,
  estadoEtapa,
  type Circuito,
} from "@/domain/entities/Transaccion";
import type { ITransaccionRepository } from "@/domain/repositories/ITransaccionRepository";
import { ok, type Result } from "@/domain/shared/Result";
import {
  agruparPorDia,
  conteoDCDelDia,
  transaccionesFiltradas,
  type ConteoDC,
} from "@/application/shared/consultas";

export interface PuntoAprobacion {
  fecha: string;
  aprobadas: number;
  rechazadas: number;
}

export interface MotivoConteo {
  codigo: string;
  descripcion: string;
  conteo: number;
}

export interface DashboardPOS {
  kpis: {
    autorizadas: number;
    rechazadas: number;
    ticketPromedio: number;
    completadas: number;
    pendientes: number;
    conIncidencia: number;
    importePendiente: number;
    dcDelDia: ConteoDC;
  };
  porDia: PuntoAprobacion[];
  motivos: MotivoConteo[];
  circuitos: { circuito: Circuito; conteo: number }[];
  etapas: {
    compensacion: { completadas: number; pendientes: number };
    posteo: { completadas: number; pendientes: number };
    deposito: { completadas: number; pendientes: number };
    aclaracion: { abiertas: number; resueltas: number };
  };
  noCompensados: { conteo: number; importe: number };
}

export const motivosDeRechazo = (
  rechazadas: { motivoRechazo?: { codigo: string; descripcion: string } | undefined }[],
): MotivoConteo[] => {
  const mapa = new Map<string, MotivoConteo>();
  for (const t of rechazadas) {
    if (!t.motivoRechazo) continue;
    const actual = mapa.get(t.motivoRechazo.codigo) ?? { ...t.motivoRechazo, conteo: 0 };
    actual.conteo += 1;
    mapa.set(actual.codigo, actual);
  }
  return [...mapa.values()].sort((a, b) => b.conteo - a.conteo);
};

export class ObtenerDashboardPOSUseCase {
  constructor(private readonly transacciones: ITransaccionRepository) {}

  async execute(filtros: FiltrosGlobales): Promise<Result<DashboardPOS>> {
    const resultado = await transaccionesFiltradas(this.transacciones, filtros);
    if (!resultado.success) return resultado;

    const txs = resultado.data.filter((t) => t.canal === "POS");
    const aprobadas = txs.filter((t) => t.aprobada);
    const rechazadas = txs.filter((t) => !t.aprobada);
    const clases = aprobadas.map(claseTrazabilidad);
    const noCompensadas = aprobadas.filter((t) => estadoEtapa(t, "COMPENSACION") !== "COMPLETADO");
    const importePendiente = noCompensadas.reduce((s, t) => s + t.monto, 0);

    const porDia = agruparPorDia(txs, (t) => t.fecha.slice(0, 10));
    return ok({
      kpis: {
        autorizadas: aprobadas.length,
        rechazadas: rechazadas.length,
        ticketPromedio: aprobadas.length
          ? aprobadas.reduce((s, t) => s + t.monto, 0) / aprobadas.length
          : 0,
        completadas: clases.filter((c) => c === "CICLO_COMPLETO").length,
        pendientes: clases.filter((c) => c === "PENDIENTE").length,
        conIncidencia: clases.filter((c) => c === "CON_INCONSISTENCIA" || c === "DUPLICADA").length,
        importePendiente,
        dcDelDia: conteoDCDelDia(txs, filtros.rango.hasta),
      },
      porDia: diasEnRango(filtros.rango).map((fecha) => {
        const del = porDia.get(fecha) ?? [];
        return {
          fecha,
          aprobadas: del.filter((t) => t.aprobada).length,
          rechazadas: del.filter((t) => !t.aprobada).length,
        };
      }),
      motivos: motivosDeRechazo(rechazadas),
      circuitos: CIRCUITOS.map((circuito) => ({
        circuito,
        conteo: txs.filter((t) => t.circuito === circuito).length,
      })),
      etapas: {
        compensacion: {
          completadas: aprobadas.filter((t) => estadoEtapa(t, "COMPENSACION") === "COMPLETADO")
            .length,
          pendientes: aprobadas.filter((t) => estadoEtapa(t, "COMPENSACION") === "PENDIENTE")
            .length,
        },
        posteo: {
          completadas: aprobadas.filter((t) => t.posteo === "COMPLETADO").length,
          pendientes: aprobadas.filter((t) => t.posteo === "PENDIENTE").length,
        },
        deposito: {
          completadas: aprobadas.filter((t) => t.deposito === "COMPLETADO").length,
          pendientes: aprobadas.filter((t) => t.deposito === "PENDIENTE").length,
        },
        aclaracion: {
          abiertas: aprobadas.filter((t) => t.aclaracion === "ABIERTA").length,
          resueltas: aprobadas.filter((t) => t.aclaracion === "RESUELTA").length,
        },
      },
      noCompensados: { conteo: noCompensadas.length, importe: importePendiente },
    });
  }
}
