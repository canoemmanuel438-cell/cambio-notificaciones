import {
  ETIQUETAS_ESTADO_ALERTA,
  ETIQUETAS_SEVERIDAD,
  GRUPOS_ALERTA,
  accionesDisponibles,
  esTransicionValida,
  type AccionAlerta,
  type Alerta,
  type EstadoAlerta,
  type GrupoAlerta,
  type Severidad,
} from "@/domain/entities/Alerta";
import { buscarRol, type RolId } from "@/domain/entities/Rol";
import type { Transaccion } from "@/domain/entities/Transaccion";
import {
  PermisoDenegadoError,
  SinDatosParaExportarError,
  TransicionAlertaInvalidaError,
} from "@/domain/errors/DomainErrors";
import type { IAlertaRepository } from "@/domain/repositories/IAlertaRepository";
import type { IBitacoraRepository } from "@/domain/repositories/IBitacoraRepository";
import type { ITransaccionRepository } from "@/domain/repositories/ITransaccionRepository";
import type { Reloj } from "@/domain/shared/Reloj";
import { fail, ok, type Result } from "@/domain/shared/Result";
import { registrar, verificarDescarga } from "@/application/shared/consultas";
import type {
  ArchivoExportado,
  FormatoExportacionService,
} from "@/application/services/FormatoExportacionService";

export type FiltroEstadoAlerta = "ACTIVAS" | EstadoAlerta | "TODAS";

export interface FiltrosAlertas {
  grupo?: GrupoAlerta | undefined;
  etapa?: string | undefined;
  severidad?: Severidad | undefined;
  estado: FiltroEstadoAlerta;
}

export interface BandejaAlertas {
  alertas: Alerta[];
  kpis: { abiertas: number; enAtencion: number; cerradas: number };
  porGrupo: { grupo: GrupoAlerta; conteo: number }[];
  etapas: string[];
}

export const filtrarAlertas = (alertas: Alerta[], f: FiltrosAlertas): Alerta[] =>
  alertas
    .filter((a) => {
      if (f.grupo && a.grupo !== f.grupo) return false;
      if (f.etapa && a.etapa !== f.etapa) return false;
      if (f.severidad && a.severidad !== f.severidad) return false;
      if (f.estado === "ACTIVAS") return a.estado !== "CERRADA";
      if (f.estado !== "TODAS") return a.estado === f.estado;
      return true;
    })
    .sort((a, b) => b.fecha.localeCompare(a.fecha));

export class ObtenerAlertasUseCase {
  constructor(private readonly alertas: IAlertaRepository) {}

  async execute(filtros: FiltrosAlertas): Promise<Result<BandejaAlertas>> {
    const resultado = await this.alertas.listar();
    if (!resultado.success) return resultado;
    const todas = resultado.data;
    const activas = todas.filter((a) => a.estado !== "CERRADA");
    return ok({
      alertas: filtrarAlertas(todas, filtros),
      kpis: {
        abiertas: todas.filter((a) => a.estado === "ABIERTA").length,
        enAtencion: todas.filter((a) => a.estado === "EN_ATENCION").length,
        cerradas: todas.filter((a) => a.estado === "CERRADA").length,
      },
      porGrupo: GRUPOS_ALERTA.map((grupo) => ({
        grupo,
        conteo: activas.filter((a) => a.grupo === grupo).length,
      })).filter((g) => g.conteo > 0),
      etapas: [...new Set(todas.map((a) => a.etapa))].sort(),
    });
  }
}

export interface DetalleAlerta {
  alerta: Alerta;
  acciones: AccionAlerta[];
  puedeActuar: boolean;
  transaccion?: Transaccion | undefined;
  duplicidad?: { original: Transaccion; duplicado: Transaccion } | undefined;
}

export class ObtenerDetalleAlertaUseCase {
  constructor(
    private readonly alertas: IAlertaRepository,
    private readonly transacciones: ITransaccionRepository,
  ) {}

  async execute(id: string, rol: RolId): Promise<Result<DetalleAlerta>> {
    const resultado = await this.alertas.obtenerPorId(id);
    if (!resultado.success) return resultado;
    const alerta = resultado.data;
    const detalle: DetalleAlerta = {
      alerta,
      acciones: accionesDisponibles(alerta.estado),
      puedeActuar: buscarRol(rol)?.atiendeAlertas ?? false,
    };
    if (alerta.transaccionId) {
      const tx = await this.transacciones.obtenerPorId(alerta.transaccionId);
      if (tx.success) {
        detalle.transaccion = tx.data;
        const dup = tx.data.duplicidad;
        if (dup) {
          const otra = await this.transacciones.obtenerPorId(dup.contraparteId);
          if (otra.success) {
            detalle.duplicidad =
              dup.rol === "DUPLICADO"
                ? { original: otra.data, duplicado: tx.data }
                : { original: tx.data, duplicado: otra.data };
          }
        }
      }
    }
    return ok(detalle);
  }
}

export class CambiarEstadoAlertaUseCase {
  constructor(
    private readonly alertas: IAlertaRepository,
    private readonly bitacora: IBitacoraRepository,
    private readonly relojEventos: Reloj,
  ) {}

  async execute(id: string, destino: EstadoAlerta, rol: RolId): Promise<Result<Alerta>> {
    if (!buscarRol(rol)?.atiendeAlertas)
      return fail(new PermisoDenegadoError("cambiar el estado de alertas"));
    const actual = await this.alertas.obtenerPorId(id);
    if (!actual.success) return actual;
    if (!esTransicionValida(actual.data.estado, destino)) {
      return fail(
        new TransicionAlertaInvalidaError(
          ETIQUETAS_ESTADO_ALERTA[actual.data.estado],
          ETIQUETAS_ESTADO_ALERTA[destino],
        ),
      );
    }
    const resultado = await this.alertas.actualizarEstado(id, destino);
    if (resultado.success) {
      await registrar(
        this.bitacora,
        this.relojEventos,
        rol,
        "Cambio de estado de alerta",
        `${id}: ${ETIQUETAS_ESTADO_ALERTA[actual.data.estado]} → ${ETIQUETAS_ESTADO_ALERTA[destino]}`,
      );
    }
    return resultado;
  }
}

export class ExportarAlertasUseCase {
  constructor(
    private readonly alertas: IAlertaRepository,
    private readonly formato: FormatoExportacionService,
    private readonly bitacora: IBitacoraRepository,
    private readonly reloj: Reloj,
    private readonly relojEventos: Reloj,
  ) {}

  async execute(filtros: FiltrosAlertas, rol: RolId): Promise<Result<ArchivoExportado>> {
    const permiso = verificarDescarga(rol);
    if (!permiso.success) return permiso;
    const resultado = await this.alertas.listar();
    if (!resultado.success) return resultado;
    const lista = filtrarAlertas(resultado.data, filtros);
    if (lista.length === 0) return fail(new SinDatosParaExportarError());
    const archivo = this.formato.excel(
      "alertas",
      {
        columnas: [
          "ID",
          "Fecha",
          "Tipo",
          "Grupo",
          "Etapa",
          "Fuente",
          "Severidad",
          "Estado",
          "Transacción",
        ],
        filas: lista.map((a) => [
          a.id,
          a.fecha.slice(0, 16).replace("T", " "),
          a.tipo,
          a.grupo,
          a.etapa,
          a.fuente,
          ETIQUETAS_SEVERIDAD[a.severidad],
          ETIQUETAS_ESTADO_ALERTA[a.estado],
          a.transaccionId ?? "",
        ]),
      },
      this.reloj(),
    );
    await registrar(this.bitacora, this.relojEventos, rol, "Descarga", archivo.nombre);
    return ok(archivo);
  }
}
