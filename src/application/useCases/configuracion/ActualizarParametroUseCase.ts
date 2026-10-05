import { puedeEditarGrupo, valorValido, type Parametro } from "@/domain/entities/Parametros";
import { buscarRol, type RolId } from "@/domain/entities/Rol";
import {
  ParametroNoEncontradoError,
  PermisoDenegadoError,
  ValorParametroInvalidoError,
} from "@/domain/errors/DomainErrors";
import type { IBitacoraRepository } from "@/domain/repositories/IBitacoraRepository";
import type { IParametroRepository } from "@/domain/repositories/IParametroRepository";
import type { Reloj } from "@/domain/shared/Reloj";
import { fail, type Result } from "@/domain/shared/Result";
import { registrar } from "@/application/shared/consultas";

export class ActualizarParametroUseCase {
  constructor(
    private readonly parametros: IParametroRepository,
    private readonly bitacora: IBitacoraRepository,
    private readonly relojEventos: Reloj,
  ) {}

  async execute(clave: string, valor: number, rolId: RolId): Promise<Result<Parametro>> {
    const lista = await this.parametros.listar();
    if (!lista.success) return lista;
    const actual = lista.data.find((p) => p.clave === clave);
    if (!actual) return fail(new ParametroNoEncontradoError(clave));
    const rol = buscarRol(rolId);
    if (!rol || !puedeEditarGrupo(rol.editaParametros, actual.grupo))
      return fail(new PermisoDenegadoError("modificar este parámetro"));
    if (!valorValido(actual, valor))
      return fail(new ValorParametroInvalidoError(actual.minimo, actual.maximo));
    const resultado = await this.parametros.actualizar(clave, valor);
    if (resultado.success) {
      await registrar(
        this.bitacora,
        this.relojEventos,
        rolId,
        "Cambio de parámetro",
        `${actual.nombre}: ${actual.valor} → ${valor} ${actual.unidad}`,
      );
    }
    return resultado;
  }
}
