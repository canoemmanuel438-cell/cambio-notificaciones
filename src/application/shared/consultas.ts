import {
  cumpleFiltrosGlobales,
  esRangoValido,
  type FiltrosGlobales,
} from "@/domain/entities/Filtros";
import type { RolId } from "@/domain/entities/Rol";
import { buscarRol } from "@/domain/entities/Rol";
import type { Transaccion } from "@/domain/entities/Transaccion";
import type { TipoEvento } from "@/domain/entities/Otros";
import { PermisoDenegadoError, RangoFechasInvalidoError } from "@/domain/errors/DomainErrors";
import type { IBitacoraRepository } from "@/domain/repositories/IBitacoraRepository";
import type { ITransaccionRepository } from "@/domain/repositories/ITransaccionRepository";
import type { Reloj } from "@/domain/shared/Reloj";
import { fail, ok, type Result } from "@/domain/shared/Result";

export async function transaccionesFiltradas(
  repositorio: ITransaccionRepository,
  filtros: FiltrosGlobales,
): Promise<Result<Transaccion[]>> {
  if (!esRangoValido(filtros.rango)) return fail(new RangoFechasInvalidoError());
  const resultado = await repositorio.listar();
  if (!resultado.success) return resultado;
  return ok(resultado.data.filter((t) => cumpleFiltrosGlobales(t, filtros)));
}

export const verificarDescarga = (rol: RolId): Result<true> =>
  buscarRol(rol)?.puedeDescargar
    ? ok(true)
    : fail(new PermisoDenegadoError("descargar información"));

/** Registro en bitácora: nunca bloquea la operación principal. */
export async function registrar(
  bitacora: IBitacoraRepository,
  reloj: Reloj,
  rol: RolId,
  evento: TipoEvento,
  detalle: string,
): Promise<void> {
  await bitacora.registrar({ fecha: reloj().toISOString(), rol, evento, detalle });
}

export const porcentaje = (parte: number, total: number, siVacio = 0): number =>
  total === 0 ? siVacio : (parte / total) * 100;

export const agruparPorDia = <T>(items: T[], dia: (item: T) => string): Map<string, T[]> => {
  const mapa = new Map<string, T[]>();
  for (const item of items) {
    const clave = dia(item);
    const lista = mapa.get(clave);
    if (lista) lista.push(item);
    else mapa.set(clave, [item]);
  }
  return mapa;
};

export interface ConteoDC {
  fecha: string;
  dc01: number;
  dc00: number;
}

/** Métrica diaria DC01 / DC00: último día del rango consultado. */
export const conteoDCDelDia = (txs: Transaccion[], hasta: string): ConteoDC => {
  const fecha = hasta.slice(0, 10);
  const delDia = txs.filter((t) => t.fecha.slice(0, 10) === fecha);
  return {
    fecha,
    dc01: delDia.filter((t) => t.codigoDC === "DC01").length,
    dc00: delDia.filter((t) => t.codigoDC === "DC00").length,
  };
};
