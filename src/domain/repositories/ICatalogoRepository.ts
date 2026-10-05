import type { Catalogos } from "../entities/Otros";
import type { Result } from "../shared/Result";

export interface ICatalogoRepository {
  obtener(): Promise<Result<Catalogos>>;
}
