import type { RecepcionArchivo } from "../entities/Otros";
import type { Result } from "../shared/Result";

export interface IArchivoRepository {
  listarRecepciones(): Promise<Result<RecepcionArchivo[]>>;
}
