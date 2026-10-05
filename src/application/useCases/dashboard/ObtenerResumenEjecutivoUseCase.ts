import { severidadMaxima, type GrupoAlerta, type Severidad } from "@/domain/entities/Alerta";
import { dentroDeRango, diasEnRango, type FiltrosGlobales } from "@/domain/entities/Filtros";
import type { FuenteArchivo, RecepcionArchivo } from "@/domain/entities/Otros";
import {
  claveFuente,
  esConInconsistencia,
  esDuplicado,
  esEvaluableMatch,
  esPendienteEnPlazo,
  tieneMatchCompensacion,
} from "@/domain/entities/Indicador";
import {
  ETAPAS_CICLO,
  estaVencida,
  estadoEtapa,
  type EtapaCiclo,
  type Transaccion,
} from "@/domain/entities/Transaccion";
import type { IAlertaRepository } from "@/domain/repositories/IAlertaRepository";
import type { IArchivoRepository } from "@/domain/repositories/IArchivoRepository";
import type { ITransaccionRepository } from "@/domain/repositories/ITransaccionRepository";
import type { Reloj } from "@/domain/shared/Reloj";
import { ok, type Result } from "@/domain/shared/Result";
import {
  agruparPorDia,
  conteoDCDelDia,
  porcentaje,
  transaccionesFiltradas,
  type ConteoDC,
} from "@/application/shared/consultas";

export const META_MATCH = 98;

export interface KpisEjecutivo {
  autorizadas: number;
  autorizadasPOS: number;
  autorizadasATM: number;
  importeProcesado: number;
  tasaMatch: number;
  cumpleMetaMatch: boolean;
  pendientesEnPlazo: number;
  conInconsistencia: number;
  porcentajeInconsistencia: number;
  duplicados: number;
  vencidas: number;
  dcDelDia: ConteoDC;
}

export interface EtapaEmbudo {
  etapa: EtapaCiclo;
  cantidad: number;
  porcentaje: number;
}

export interface PuntoVolumen {
  fecha: string;
  total: number;
}

export type EstadoIntegridad = "CONTINUO" | "EN_TIEMPO" | "EN_RIESGO" | "INCUMPLIDO";

export interface FilaIntegridad {
  /** Clave del indicador de detalle (drill-down) de esta fuente. */
  clave: string;
  fuente: string;
  recibidos: number | null;
  esperados: number | null;
  registros: number;
  tasaMatch: number;
  estado: EstadoIntegridad;
}

export interface GrupoAlertasAbiertas {
  grupo: GrupoAlerta;
  severidadMaxima: Severidad;
  conteo: number;
}

export interface ResumenEjecutivo {
  kpis: KpisEjecutivo;
  embudo: EtapaEmbudo[];
  volumenDiario: PuntoVolumen[];
  promedioDiario: number;
  integridad: FilaIntegridad[];
  alertasAbiertas: GrupoAlertasAbiertas[];
}

/** Match: aprobadas con compensación evaluada cuyo cruce online vs. compensación es correcto. */
export const tasaMatchCompensacion = (transacciones: Transaccion[]): number => {
  const evaluables = transacciones.filter(esEvaluableMatch);
  const conMatch = evaluables.filter(tieneMatchCompensacion);
  return porcentaje(conMatch.length, evaluables.length, 100);
};

export class ObtenerResumenEjecutivoUseCase {
  constructor(
    private readonly transacciones: ITransaccionRepository,
    private readonly alertas: IAlertaRepository,
    private readonly archivos: IArchivoRepository,
    private readonly reloj: Reloj,
  ) {}

  async execute(filtros: FiltrosGlobales): Promise<Result<ResumenEjecutivo>> {
    const resultado = await transaccionesFiltradas(this.transacciones, filtros);
    if (!resultado.success) return resultado;
    const [alertas, recepciones] = await Promise.all([
      this.alertas.listar(),
      this.archivos.listarRecepciones(),
    ]);
    if (!alertas.success) return alertas;
    if (!recepciones.success) return recepciones;

    const txs = resultado.data;
    const ahora = this.reloj();
    const aprobadas = txs.filter((t) => t.aprobada);
    const tasaMatch = tasaMatchCompensacion(txs);
    const vencidas = txs.filter((t) => estaVencida(t, ahora)).length;
    const conInconsistencia = txs.filter((t) => esConInconsistencia(t, ahora)).length;

    const kpis: KpisEjecutivo = {
      autorizadas: aprobadas.length,
      autorizadasPOS: aprobadas.filter((t) => t.canal === "POS").length,
      autorizadasATM: aprobadas.filter((t) => t.canal === "ATM").length,
      importeProcesado: aprobadas.reduce((s, t) => s + t.monto, 0),
      tasaMatch,
      cumpleMetaMatch: tasaMatch >= META_MATCH,
      pendientesEnPlazo: txs.filter((t) => esPendienteEnPlazo(t, ahora)).length,
      conInconsistencia,
      porcentajeInconsistencia: porcentaje(conInconsistencia, txs.length),
      duplicados: txs.filter(esDuplicado).length,
      vencidas,
      dcDelDia: conteoDCDelDia(txs, filtros.rango.hasta),
    };

    const embudo = ETAPAS_CICLO.map((etapa) => {
      const cantidad = aprobadas.filter((t) => estadoEtapa(t, etapa) === "COMPLETADO").length;
      return { etapa, cantidad, porcentaje: porcentaje(cantidad, aprobadas.length) };
    });

    const porDia = agruparPorDia(txs, (t) => t.fecha.slice(0, 10));
    const volumenDiario = diasEnRango(filtros.rango).map((fecha) => ({
      fecha,
      total: porDia.get(fecha)?.length ?? 0,
    }));
    const promedioDiario =
      volumenDiario.length === 0
        ? 0
        : volumenDiario.reduce((s, p) => s + p.total, 0) / volumenDiario.length;

    const abiertasPorGrupo = new Map<GrupoAlerta, Severidad[]>();
    for (const alerta of alertas.data) {
      if (alerta.estado === "CERRADA") continue;
      abiertasPorGrupo.set(alerta.grupo, [
        ...(abiertasPorGrupo.get(alerta.grupo) ?? []),
        alerta.severidad,
      ]);
    }
    const alertasAbiertas = [...abiertasPorGrupo.entries()]
      .map(([grupo, severidades]) => ({
        grupo,
        severidadMaxima: severidadMaxima(severidades) ?? "BAJA",
        conteo: severidades.length,
      }))
      .sort((a, b) => b.conteo - a.conteo);

    return ok({
      kpis,
      embudo,
      volumenDiario,
      promedioDiario,
      integridad: this.integridad(
        txs,
        recepciones.data.filter((r) =>
          dentroDeRango(`${r.fechaDatos}T12:00:00.000Z`, filtros.rango),
        ),
      ),
      alertasAbiertas,
    });
  }

  private integridad(txs: Transaccion[], recepciones: RecepcionArchivo[]): FilaIntegridad[] {
    const pos = txs.filter((t) => t.canal === "POS");
    const atm = txs.filter((t) => t.canal === "ATM");
    const conteo = (fuente: FuenteArchivo) => {
      const propias = recepciones.filter((r) => r.fuente === fuente);
      return { esperados: propias.length, recibidos: propias.filter((r) => r.recibido).length };
    };
    const fila = (
      indicador: string,
      fuente: string,
      clave: FuenteArchivo,
      registros: Transaccion[],
      riesgo = false,
    ): FilaIntegridad => {
      const { esperados, recibidos } = conteo(clave);
      const estado: EstadoIntegridad =
        recibidos < esperados ? "INCUMPLIDO" : riesgo ? "EN_RIESGO" : "EN_TIEMPO";
      return {
        clave: claveFuente(indicador),
        fuente,
        recibidos,
        esperados,
        registros: registros.length,
        tasaMatch: tasaMatchCompensacion(registros),
        estado,
      };
    };
    const online = pos.filter((t) => t.origen === "ONLINE");
    const tef = pos.filter((t) => t.origen === "ARCHIVO");
    return [
      {
        clave: claveFuente("online"),
        fuente: "Autorizaciones online",
        recibidos: null,
        esperados: null,
        registros: online.length,
        tasaMatch: tasaMatchCompensacion(online),
        estado: "CONTINUO",
      },
      fila("tlf", "Archivo TLF", "TLF", atm),
      fila("stats", "Archivo STATS", "STATS", atm),
      fila("setl", "Archivo SETL", "SETL", atm),
      fila("comp-pos", "Compensación POS", "COMP_POS", pos),
      fila("tef", "Archivos TEF", "TEF", tef, tef.some(esDuplicado)),
      fila("epape", "EPAPE (Electronic Payment Advice)", "EPAPE", pos),
    ];
  }
}
