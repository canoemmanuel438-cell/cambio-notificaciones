import {
  desvioMinutos,
  estadoEjecucion,
  type EjecucionSLA,
  type EstadoSLA,
} from "@/domain/entities/ProcesoSLA";
import type { ISLARepository } from "@/domain/repositories/ISLARepository";
import type { Reloj } from "@/domain/shared/Reloj";
import { ok, type Result } from "@/domain/shared/Result";
import { porcentaje } from "@/application/shared/consultas";

export const META_CUMPLIMIENTO_SLA = 98;

export interface FilaProcesoSLA {
  ejecucion: EjecucionSLA;
  estado: EstadoSLA;
  desvioMin: number;
}

export interface DashboardSLA {
  fechaHoy: string;
  fechaSeleccionada: string;
  ahoraMin: number;
  kpis: { enTiempo: number; enRiesgo: number; incumplidos: number; retrasoAcumuladoMin: number };
  cumplimientoDiario: { fecha: string; porcentaje: number; evaluados: number }[];
  procesos: FilaProcesoSLA[];
}

export class ObtenerDashboardSLAUseCase {
  constructor(
    private readonly sla: ISLARepository,
    private readonly reloj: Reloj,
  ) {}

  async execute(fecha?: string): Promise<Result<DashboardSLA>> {
    const resultado = await this.sla.listarEjecuciones();
    if (!resultado.success) return resultado;

    const ahora = this.reloj();
    const fechaHoy = ahora.toISOString().slice(0, 10);
    const ahoraMin = ahora.getUTCHours() * 60 + ahora.getUTCMinutes();
    const evaluar = (e: EjecucionSLA): FilaProcesoSLA => {
      const referencia = e.fecha === fechaHoy ? ahoraMin : null;
      return {
        ejecucion: e,
        estado: estadoEjecucion(e, referencia),
        desvioMin: desvioMinutos(e, referencia),
      };
    };

    const fechas = [...new Set(resultado.data.map((e) => e.fecha))].sort();
    const cumplimientoDiario = fechas.map((f) => {
      const filas = resultado.data.filter((e) => e.fecha === f).map(evaluar);
      const evaluados = filas.filter((x) => x.estado !== "PROGRAMADO");
      return {
        fecha: f,
        evaluados: evaluados.length,
        porcentaje: porcentaje(
          evaluados.filter((x) => x.estado === "EN_TIEMPO").length,
          evaluados.length,
          100,
        ),
      };
    });

    const fechaSeleccionada = fecha && fechas.includes(fecha) ? fecha : fechaHoy;
    const procesos = resultado.data.filter((e) => e.fecha === fechaSeleccionada).map(evaluar);

    return ok({
      fechaHoy,
      fechaSeleccionada,
      ahoraMin,
      kpis: {
        enTiempo: procesos.filter((p) => p.estado === "EN_TIEMPO").length,
        enRiesgo: procesos.filter((p) => p.estado === "EN_RIESGO").length,
        incumplidos: procesos.filter((p) => p.estado === "INCUMPLIDO" || p.estado === "SIN_RECIBIR")
          .length,
        retrasoAcumuladoMin: procesos.reduce((s, p) => s + p.desvioMin, 0),
      },
      cumplimientoDiario,
      procesos,
    });
  }
}
