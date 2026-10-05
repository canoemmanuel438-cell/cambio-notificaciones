import type { Parametro } from "@/domain/entities/Parametros";
import { ParametroNoEncontradoError } from "@/domain/errors/DomainErrors";
import type { IParametroRepository } from "@/domain/repositories/IParametroRepository";
import { fail, ok, type Result } from "@/domain/shared/Result";
import { ParametroMapper } from "@/infrastructure/mappers/ParametroMapper";
import { datasetRaw } from "@/infrastructure/mock/data/generador";
import type { Almacenamiento } from "@/infrastructure/storage/AlmacenamientoNavegador";

const CLAVE = "monitor-pos-atm:parametros";

/** Thin adapter: valores por defecto del origen + cambios guardados en el navegador. */
export class NavegadorParametroRepository implements IParametroRepository {
  constructor(private readonly almacenamiento: Almacenamiento) {}

  private cambios(): Record<string, number> {
    return this.almacenamiento.leer<Record<string, number>>(CLAVE, {});
  }

  async listar(): Promise<Result<Parametro[]>> {
    const cambios = this.cambios();
    return ok(
      datasetRaw().parametros.map((raw) => {
        const p = ParametroMapper.desdeRaw(raw);
        return cambios[p.clave] !== undefined ? { ...p, valor: cambios[p.clave]! } : p;
      }),
    );
  }

  async actualizar(clave: string, valor: number): Promise<Result<Parametro>> {
    const raw = datasetRaw().parametros.find((p) => p.key === clave);
    if (!raw) return fail(new ParametroNoEncontradoError(clave));
    this.almacenamiento.escribir(CLAVE, { ...this.cambios(), [clave]: valor });
    return ok({ ...ParametroMapper.desdeRaw(raw), valor });
  }
}
