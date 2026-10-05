import { diasEnRango, type FiltrosGlobales } from "@/domain/entities/Filtros";
import { OPERACIONES_ATM, estadoEtapa, type OperacionATM } from "@/domain/entities/Transaccion";
import type { IArchivoRepository } from "@/domain/repositories/IArchivoRepository";
import type { ITransaccionRepository } from "@/domain/repositories/ITransaccionRepository";
import { ok, type Result } from "@/domain/shared/Result";
import { agruparPorDia, porcentaje, transaccionesFiltradas } from "@/application/shared/consultas";
import type { PuntoAprobacion } from "./ObtenerDashboardPOSUseCase";

export interface DiaSETL {
  fecha: string;
  conteo: number;
  importe: number;
}

export interface DashboardATM {
  setlFaltante: string | null;
  resumenTLF: {
    total: number;
    aprobadas: number;
    rechazadas: number;
    importeAprobado: number;
    retirosAprobados: number;
    importeDispensado: number;
  };
  resumenSETL: { ultimosDias: DiaSETL[]; conteo: number; importe: number };
  tipos: { operacion: OperacionATM; aprobadas: number; rechazadas: number }[];
  porDia: PuntoAprobacion[];
  comparacion: { match: number; sinMatch: number; tasa: number };
}

export const DIAS_RESUMEN_SETL = 5;

export class ObtenerDashboardATMUseCase {
  constructor(
    private readonly transacciones: ITransaccionRepository,
    private readonly archivos: IArchivoRepository,
  ) {}

  async execute(filtros: FiltrosGlobales): Promise<Result<DashboardATM>> {
    const resultado = await transaccionesFiltradas(this.transacciones, filtros);
    if (!resultado.success) return resultado;
    const recepciones = await this.archivos.listarRecepciones();
    if (!recepciones.success) return recepciones;

    const txs = resultado.data.filter((t) => t.canal === "ATM");
    const aprobadas = txs.filter((t) => t.aprobada);
    const retiros = aprobadas.filter((t) => t.operacionATM === "RETIRO");

    const faltantes = recepciones.data
      .filter((r) => r.fuente === "SETL" && !r.recibido)
      .map((r) => r.fechaDatos)
      .sort();

    const liquidadas = aprobadas.filter((t) => estadoEtapa(t, "LIQUIDACION") === "COMPLETADO");
    const setlPorDia = [...agruparPorDia(liquidadas, (t) => t.fecha.slice(0, 10)).entries()]
      .map(([fecha, lista]) => ({
        fecha,
        conteo: lista.length,
        importe: lista.reduce((s, t) => s + t.monto, 0),
      }))
      .sort((a, b) => b.fecha.localeCompare(a.fecha));

    const evaluables = aprobadas.filter((t) => {
      const comp = estadoEtapa(t, "COMPENSACION");
      return comp === "COMPLETADO" || comp === "INCONSISTENCIA";
    });
    const match = evaluables.filter((t) => estadoEtapa(t, "COMPENSACION") === "COMPLETADO").length;

    const porDia = agruparPorDia(txs, (t) => t.fecha.slice(0, 10));
    return ok({
      setlFaltante: faltantes.at(-1) ?? null,
      resumenTLF: {
        total: txs.length,
        aprobadas: aprobadas.length,
        rechazadas: txs.length - aprobadas.length,
        importeAprobado: aprobadas.reduce((s, t) => s + t.monto, 0),
        retirosAprobados: retiros.length,
        importeDispensado: retiros.reduce((s, t) => s + t.monto, 0),
      },
      resumenSETL: {
        ultimosDias: setlPorDia.slice(0, DIAS_RESUMEN_SETL),
        conteo: liquidadas.length,
        importe: liquidadas.reduce((s, t) => s + t.monto, 0),
      },
      tipos: OPERACIONES_ATM.map((operacion) => {
        const propias = txs.filter((t) => t.operacionATM === operacion);
        const ok_ = propias.filter((t) => t.aprobada).length;
        return { operacion, aprobadas: ok_, rechazadas: propias.length - ok_ };
      }),
      porDia: diasEnRango(filtros.rango).map((fecha) => {
        const del = porDia.get(fecha) ?? [];
        return {
          fecha,
          aprobadas: del.filter((t) => t.aprobada).length,
          rechazadas: del.filter((t) => !t.aprobada).length,
        };
      }),
      comparacion: {
        match,
        sinMatch: evaluables.length - match,
        tasa: porcentaje(match, evaluables.length, 100),
      },
    });
  }
}
