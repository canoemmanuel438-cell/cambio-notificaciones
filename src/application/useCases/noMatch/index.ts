import type { RolId } from "@/domain/entities/Rol";
import {
  enmascararPAN,
  plazoPresentacion,
  type PlazoPresentacion,
  type Transaccion,
} from "@/domain/entities/Transaccion";
import { SinDatosParaExportarError } from "@/domain/errors/DomainErrors";
import type { IBitacoraRepository } from "@/domain/repositories/IBitacoraRepository";
import type { ITransaccionRepository } from "@/domain/repositories/ITransaccionRepository";
import type { Reloj } from "@/domain/shared/Reloj";
import { fail, ok, type Result } from "@/domain/shared/Result";
import { registrar, verificarDescarga } from "@/application/shared/consultas";
import type {
  ArchivoExportado,
  FormatoExportacionService,
} from "@/application/services/FormatoExportacionService";

export type CategoriaNoMatch = "AUTORIZADAS_NO_COMPENSADAS" | "COMPENSADAS_SIN_AUTORIZACION";

export const perteneceACategoria = (t: Transaccion, categoria: CategoriaNoMatch): boolean =>
  categoria === "AUTORIZADAS_NO_COMPENSADAS"
    ? t.inconsistencia === "AUTORIZADA_SIN_COMPENSAR" ||
      t.inconsistencia === "SIN_MATCH_TLF_STATS" ||
      t.inconsistencia === "PLAZO_VENCIDO"
    : t.inconsistencia === "COMPENSADA_SIN_AUTORIZACION";

export interface FilaNoMatch {
  transaccion: Transaccion;
  plazo: PlazoPresentacion;
  estatus: "EN_PROCESO" | "VENCIDO";
  fuente: string;
  archivo: string;
}

/** Fuente de origen del registro: compensación si llegó sin autorización, si no la autorización. */
export const fuenteDeOrigen = (t: Transaccion): string => {
  const etapa = t.etapas.find(
    (e) =>
      e.etapa ===
      (t.inconsistencia === "COMPENSADA_SIN_AUTORIZACION" ? "COMPENSACION" : "AUTORIZACION"),
  );
  return etapa?.fuente ?? "—";
};

export interface ReporteNoMatch {
  conteos: Record<CategoriaNoMatch, number>;
  resumen: { transacciones: number; importe: number; masAntigua: string | null; vencidas: number };
  filas: FilaNoMatch[];
}

async function filasDe(repo: ITransaccionRepository, categoria: CategoriaNoMatch, ahora: Date) {
  const resultado = await repo.listar();
  if (!resultado.success) return resultado;
  const todas = resultado.data;
  const filas: FilaNoMatch[] = todas
    .filter((t) => perteneceACategoria(t, categoria))
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .map((t) => {
      const plazo = plazoPresentacion(t, ahora);
      return {
        transaccion: t,
        plazo,
        estatus: plazo.vencido || t.inconsistencia === "PLAZO_VENCIDO" ? "VENCIDO" : "EN_PROCESO",
        fuente: fuenteDeOrigen(t),
        archivo: t.archivoOrigen || "—",
      };
    });
  return ok({
    filas,
    conteos: {
      AUTORIZADAS_NO_COMPENSADAS: todas.filter((t) =>
        perteneceACategoria(t, "AUTORIZADAS_NO_COMPENSADAS"),
      ).length,
      COMPENSADAS_SIN_AUTORIZACION: todas.filter((t) =>
        perteneceACategoria(t, "COMPENSADAS_SIN_AUTORIZACION"),
      ).length,
    },
  });
}

export class ObtenerReporteNoMatchUseCase {
  constructor(
    private readonly transacciones: ITransaccionRepository,
    private readonly reloj: Reloj,
  ) {}

  async execute(categoria: CategoriaNoMatch): Promise<Result<ReporteNoMatch>> {
    const resultado = await filasDe(this.transacciones, categoria, this.reloj());
    if (!resultado.success) return resultado;
    const { filas, conteos } = resultado.data;
    return ok({
      conteos,
      filas,
      resumen: {
        transacciones: filas.length,
        importe: filas.reduce((s, f) => s + f.transaccion.monto, 0),
        masAntigua: filas[0]?.transaccion.fecha ?? null,
        vencidas: filas.filter((f) => f.estatus === "VENCIDO").length,
      },
    });
  }
}

export class ExportarNoMatchUseCase {
  constructor(
    private readonly transacciones: ITransaccionRepository,
    private readonly formato: FormatoExportacionService,
    private readonly bitacora: IBitacoraRepository,
    private readonly reloj: Reloj,
    private readonly relojEventos: Reloj,
  ) {}

  async execute(categoria: CategoriaNoMatch, rol: RolId): Promise<Result<ArchivoExportado>> {
    const permiso = verificarDescarga(rol);
    if (!permiso.success) return permiso;
    const resultado = await filasDe(this.transacciones, categoria, this.reloj());
    if (!resultado.success) return resultado;
    if (resultado.data.filas.length === 0) return fail(new SinDatosParaExportarError());
    const archivo = this.formato.excel(
      categoria === "AUTORIZADAS_NO_COMPENSADAS" ? "no-match-autorizadas" : "no-match-compensadas",
      {
        columnas: [
          "ID",
          "Fecha",
          "Adquirente",
          "Emisor",
          "Afiliación",
          "PAN",
          "Fuente",
          "Nombre de archivo",
          "Autorización",
          "Importe",
          "Estatus",
          "Plazo",
        ],
        filas: resultado.data.filas.map(({ transaccion: t, estatus, plazo, fuente, archivo }) => [
          t.id,
          t.fecha.slice(0, 16).replace("T", " "),
          t.adquirente,
          t.emisor,
          t.afiliacion,
          enmascararPAN(t.pan),
          fuente,
          archivo,
          t.autorizacion,
          Number(t.monto.toFixed(2)),
          estatus === "VENCIDO" ? "Vencido" : "En proceso",
          plazo.vencido ? "Vencido" : `Quedan ${plazo.diasRestantes} días`,
        ]),
      },
      this.reloj(),
    );
    await registrar(this.bitacora, this.relojEventos, rol, "Descarga", archivo.nombre);
    return ok(archivo);
  }
}
