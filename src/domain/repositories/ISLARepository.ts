import type { EjecucionSLA } from "../entities/ProcesoSLA";
import type { Result } from "../shared/Result";

export interface ISLARepository {
  listarEjecuciones(): Promise<Result<EjecucionSLA[]>>;
}
