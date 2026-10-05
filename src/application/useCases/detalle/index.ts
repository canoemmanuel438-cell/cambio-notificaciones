import type { FiltrosGlobales } from "@/domain/entities/Filtros";
import {
  definirIndicador,
  type DefinicionIndicador,
  type OrigenIndicador,
} from "@/domain/entities/Indicador";
import { buscarRol, puedeVerPantalla, type RolId } from "@/domain/entities/Rol";
import {
  PermisoDenegadoError,
  IndicadorNoEncontradoError,
  SinDatosParaExportarError,
} from "@/domain/errors/DomainErrors";
import type { IBitacoraRepository } from "@/domain/repositories/IBitacoraRepository";
import type { ITransaccionRepository } from "@/domain/repositories/ITransaccionRepository";
import type { Reloj } from "@/domain/shared/Reloj";
import { fail, ok, type Result } from "@/domain/shared/Result";
import {
  filaTrazabilidad,
  tablaTrazabilidad,
  type FilaTrazabilidad,
} from "@/application/services/FichaService";
import type {
  ArchivoExportado,
  FormatoExportacionService,
} from "@/application/services/FormatoExportacionService";
import {
  registrar,
  transaccionesFiltradas,
  verificarDescarga,
} from "@/application/shared/consultas";

export interface ResumenDetalle {
  operaciones: number;
  importe: number;
  conInconsistencia: number;
  enProceso: number;
}

export interface DetalleIndicador {
  clave: string;
  titulo: string;
  descripcion: string;
  origen: OrigenIndicador;
  /** Día al que pertenece el indicador (YYYY-MM-DD), si lo tiene. */
  dia?: string | undefined;
  filas: FilaTrazabilidad[];
  resumen: ResumenDetalle;
}

async function filasDelIndicador(
  repo: ITransaccionRepository,
  reloj: Reloj,
  clave: string,
  filtros: FiltrosGlobales,
  rol: RolId,
): Promise<Result<{ definicion: DefinicionIndicador; filas: FilaTrazabilidad[] }>> {
  const definicion = definirIndicador(clave);
  if (!definicion) return fail(new IndicadorNoEncontradoError(clave));
  const perfil = buscarRol(rol);
  if (!perfil || !puedeVerPantalla(perfil, definicion.origen))
    return fail(new PermisoDenegadoError("consultar este detalle"));

  const resultado = definicion.ignoraFiltros
    ? await repo.listar()
    : await transaccionesFiltradas(repo, filtros);
  if (!resultado.success) return resultado;

  const ahora = reloj();
  const contexto = { ahora, diaFinal: filtros.rango.hasta.slice(0, 10) };
  const filas = resultado.data
    .filter((t) => definicion.incluye(t, contexto))
    .sort((a, b) => (definicion.ordenPorMonto ? b.monto - a.monto : b.fecha.localeCompare(a.fecha)))
    .map((t) => filaTrazabilidad(t, ahora));
  return ok({ definicion, filas });
}

const resumir = (filas: FilaTrazabilidad[]): ResumenDetalle => ({
  operaciones: filas.length,
  importe: filas.reduce((suma, f) => suma + f.transaccion.monto, 0),
  conInconsistencia: filas.filter((f) => f.estatus === "NO_MATCH" || f.estatus === "VENCIDA")
    .length,
  enProceso: filas.filter((f) => f.estatus === "EN_PROCESO").length,
});

/** Operaciones que forman un indicador de los dashboards (drill-down). */
export class ObtenerDetalleIndicadorUseCase {
  constructor(
    private readonly transacciones: ITransaccionRepository,
    private readonly bitacora: IBitacoraRepository,
    private readonly reloj: Reloj,
    private readonly relojEventos: Reloj,
  ) {}

  async execute(
    clave: string,
    filtros: FiltrosGlobales,
    rol: RolId,
  ): Promise<Result<DetalleIndicador>> {
    const resultado = await filasDelIndicador(this.transacciones, this.reloj, clave, filtros, rol);
    if (!resultado.success) return resultado;
    const { definicion, filas } = resultado.data;
    await registrar(
      this.bitacora,
      this.relojEventos,
      rol,
      "Consulta de detalle",
      `${definicion.titulo} · ${filas.length} operaciones`,
    );
    return ok({
      clave: definicion.clave,
      titulo: definicion.titulo,
      descripcion: definicion.descripcion,
      origen: definicion.origen,
      dia: definicion.dia,
      filas,
      resumen: resumir(filas),
    });
  }
}

export class ExportarDetalleIndicadorUseCase {
  constructor(
    private readonly transacciones: ITransaccionRepository,
    private readonly formato: FormatoExportacionService,
    private readonly bitacora: IBitacoraRepository,
    private readonly reloj: Reloj,
    private readonly relojEventos: Reloj,
  ) {}

  async execute(
    clave: string,
    filtros: FiltrosGlobales,
    rol: RolId,
  ): Promise<Result<ArchivoExportado>> {
    const permiso = verificarDescarga(rol);
    if (!permiso.success) return permiso;
    const resultado = await filasDelIndicador(this.transacciones, this.reloj, clave, filtros, rol);
    if (!resultado.success) return resultado;
    if (resultado.data.filas.length === 0) return fail(new SinDatosParaExportarError());
    const archivo = this.formato.csv(
      `detalle-${clave.replace(/[^a-z0-9-]+/gi, "-")}`,
      tablaTrazabilidad(resultado.data.filas),
      this.reloj(),
    );
    await registrar(this.bitacora, this.relojEventos, rol, "Descarga", archivo.nombre);
    return ok(archivo);
  }
}
