import type { Parametro } from "../entities/Parametros";
import type { Result } from "../shared/Result";

export interface IParametroRepository {
  listar(): Promise<Result<Parametro[]>>;
  actualizar(clave: string, valor: number): Promise<Result<Parametro>>;
}
