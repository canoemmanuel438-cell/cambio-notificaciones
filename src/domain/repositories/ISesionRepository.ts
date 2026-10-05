import type { Sesion } from "../entities/Otros";
import type { Result } from "../shared/Result";

export interface ISesionRepository {
  obtener(): Promise<Result<Sesion>>;
  guardar(sesion: Sesion): Promise<Result<Sesion>>;
}
