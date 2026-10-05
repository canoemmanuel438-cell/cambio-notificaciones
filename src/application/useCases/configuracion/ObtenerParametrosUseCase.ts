import {
  GRUPOS_PARAMETRO,
  puedeEditarGrupo,
  type GrupoParametro,
  type Parametro,
} from "@/domain/entities/Parametros";
import { buscarRol, type RolId } from "@/domain/entities/Rol";
import { RolInvalidoError } from "@/domain/errors/DomainErrors";
import type { IParametroRepository } from "@/domain/repositories/IParametroRepository";
import { fail, ok, type Result } from "@/domain/shared/Result";

export interface GrupoParametros {
  grupo: GrupoParametro;
  editable: boolean;
  parametros: Parametro[];
}

export class ObtenerParametrosUseCase {
  constructor(private readonly parametros: IParametroRepository) {}

  async execute(rolId: RolId): Promise<Result<GrupoParametros[]>> {
    const rol = buscarRol(rolId);
    if (!rol) return fail(new RolInvalidoError(rolId));
    const resultado = await this.parametros.listar();
    if (!resultado.success) return resultado;
    return ok(
      GRUPOS_PARAMETRO.map((grupo) => ({
        grupo,
        editable: puedeEditarGrupo(rol.editaParametros, grupo),
        parametros: resultado.data.filter((p) => p.grupo === grupo),
      })),
    );
  }
}
