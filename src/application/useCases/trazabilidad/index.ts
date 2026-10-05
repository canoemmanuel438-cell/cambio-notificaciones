import { cumpleCriterios, tieneCriterios, type CriteriosBusqueda } from "@/domain/entities/Filtros";
import type { RolId } from "@/domain/entities/Rol";
import { claseTrazabilidad, type Transaccion } from "@/domain/entities/Transaccion";
import {
  CriteriosBusquedaVaciosError,
  SinDatosParaExportarError,
} from "@/domain/errors/DomainErrors";
import type { IBitacoraRepository } from "@/domain/repositories/IBitacoraRepository";
import type { ITransaccionRepository } from "@/domain/repositories/ITransaccionRepository";
import type { Reloj } from "@/domain/shared/Reloj";
import { fail, ok, type Result } from "@/domain/shared/Result";
import { registrar, verificarDescarga } from "@/application/shared/consultas";
import {
  construirFicha,
  filaTrazabilidad,
  lineasFicha,
  tablaTrazabilidad,
  type FichaTransaccion,
  type FilaTrazabilidad,
} from "@/application/services/FichaService";
import type {
  ArchivoExportado,
  FormatoExportacionService,
} from "@/application/services/FormatoExportacionService";

const describirCriterios = (c: CriteriosBusqueda): string =>
  Object.entries(c)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => `${k}=${String(v)}`)
    .join(", ");

async function buscar(
  repo: ITransaccionRepository,
  criterios: CriteriosBusqueda,
  ahora: Date,
): Promise<Result<FilaTrazabilidad[]>> {
  if (!tieneCriterios(criterios)) return fail(new CriteriosBusquedaVaciosError());
  const resultado = await repo.listar();
  if (!resultado.success) return resultado;
  return ok(
    resultado.data
      .filter((t) => cumpleCriterios(t, criterios))
      .sort((a, b) => b.fecha.localeCompare(a.fecha))
      .map((t) => filaTrazabilidad(t, ahora))
      .filter((f) => !criterios.estatus || f.estatus === criterios.estatus),
  );
}

export class BuscarTransaccionesUseCase {
  constructor(
    private readonly transacciones: ITransaccionRepository,
    private readonly bitacora: IBitacoraRepository,
    private readonly reloj: Reloj,
    private readonly relojEventos: Reloj,
  ) {}

  async execute(criterios: CriteriosBusqueda, rol: RolId): Promise<Result<FilaTrazabilidad[]>> {
    const resultado = await buscar(this.transacciones, criterios, this.reloj());
    if (resultado.success) {
      await registrar(
        this.bitacora,
        this.relojEventos,
        rol,
        "Búsqueda",
        `${describirCriterios(criterios)} · ${resultado.data.length} resultados`,
      );
    }
    return resultado;
  }
}

async function fichaDe(
  repo: ITransaccionRepository,
  id: string,
  ahora: Date,
): Promise<Result<FichaTransaccion>> {
  const resultado = await repo.obtenerPorId(id);
  if (!resultado.success) return resultado;
  const t = resultado.data;
  let contraparte: Transaccion | undefined;
  if (t.duplicidad) {
    const otra = await repo.obtenerPorId(t.duplicidad.contraparteId);
    if (otra.success) contraparte = otra.data;
  }
  return ok(construirFicha(t, ahora, contraparte));
}

export class ObtenerFichaTransaccionUseCase {
  constructor(
    private readonly transacciones: ITransaccionRepository,
    private readonly bitacora: IBitacoraRepository,
    private readonly reloj: Reloj,
    private readonly relojEventos: Reloj,
  ) {}

  async execute(id: string, rol: RolId): Promise<Result<FichaTransaccion>> {
    const resultado = await fichaDe(this.transacciones, id, this.reloj());
    if (resultado.success)
      await registrar(this.bitacora, this.relojEventos, rol, "Apertura de ficha", id);
    return resultado;
  }
}

export class ExportarTrazabilidadUseCase {
  constructor(
    private readonly transacciones: ITransaccionRepository,
    private readonly formato: FormatoExportacionService,
    private readonly bitacora: IBitacoraRepository,
    private readonly reloj: Reloj,
    private readonly relojEventos: Reloj,
  ) {}

  async execute(criterios: CriteriosBusqueda, rol: RolId): Promise<Result<ArchivoExportado>> {
    const permiso = verificarDescarga(rol);
    if (!permiso.success) return permiso;
    const resultado = await buscar(this.transacciones, criterios, this.reloj());
    if (!resultado.success) return resultado;
    if (resultado.data.length === 0) return fail(new SinDatosParaExportarError());
    const archivo = this.formato.csv(
      "trazabilidad",
      tablaTrazabilidad(resultado.data),
      this.reloj(),
    );
    await registrar(this.bitacora, this.relojEventos, rol, "Descarga", archivo.nombre);
    return ok(archivo);
  }
}

export class ExportarFichaUseCase {
  constructor(
    private readonly transacciones: ITransaccionRepository,
    private readonly formato: FormatoExportacionService,
    private readonly bitacora: IBitacoraRepository,
    private readonly reloj: Reloj,
    private readonly relojEventos: Reloj,
  ) {}

  async execute(id: string, tipo: "EXCEL" | "PDF", rol: RolId): Promise<Result<ArchivoExportado>> {
    const permiso = verificarDescarga(rol);
    if (!permiso.success) return permiso;
    const resultado = await fichaDe(this.transacciones, id, this.reloj());
    if (!resultado.success) return resultado;
    const lineas = lineasFicha(resultado.data);
    const prefijo = `ficha-${id}`;
    const archivo =
      tipo === "PDF"
        ? this.formato.pdf(prefijo, `Ficha de la transacción ${id}`, lineas, this.reloj())
        : this.formato.excel(
            prefijo,
            { columnas: ["Dato"], filas: lineas.filter(Boolean).map((l) => [l]) },
            this.reloj(),
          );
    await registrar(this.bitacora, this.relojEventos, rol, "Descarga", archivo.nombre);
    return ok(archivo);
  }
}

export interface EjemploBusqueda {
  etiqueta: string;
  criterios: CriteriosBusqueda;
}

/** Ejemplos reales tomados del conjunto de datos para demostrar la búsqueda. */
export class ObtenerEjemplosBusquedaUseCase {
  constructor(private readonly transacciones: ITransaccionRepository) {}

  async execute(): Promise<Result<EjemploBusqueda[]>> {
    const resultado = await this.transacciones.listar();
    if (!resultado.success) return resultado;
    const txs = resultado.data;
    const ejemplos: EjemploBusqueda[] = [];
    const atm = txs.find((t) => t.canal === "ATM" && claseTrazabilidad(t) === "CICLO_COMPLETO");
    if (atm)
      ejemplos.push({
        etiqueta: "Autorización ATM con ciclo completo",
        criterios: { autorizacion: atm.autorizacion, fecha: atm.fecha.slice(0, 10) },
      });
    const dup = txs.find((t) => t.duplicidad?.rol === "DUPLICADO");
    if (dup) ejemplos.push({ etiqueta: "Duplicada", criterios: { id: dup.id } });
    const pos = txs.find(
      (t) => t.canal === "POS" && t.aprobada && t.fecha.slice(0, 10) < txs[0]!.fecha.slice(0, 10),
    );
    if (pos)
      ejemplos.push({
        etiqueta: "Afiliación + fecha",
        criterios: { afiliacion: pos.afiliacion, fecha: pos.fecha.slice(0, 10) },
      });
    const disc = txs.find((t) => t.inconsistencia === "DISCREPANCIA_IMPORTE");
    if (disc)
      ejemplos.push({
        etiqueta: "Discrepancia de importe",
        criterios: { referencia: disc.referencia },
      });
    return ok(ejemplos);
  }
}
