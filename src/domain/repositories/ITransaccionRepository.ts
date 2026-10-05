import type { Transaccion } from "../entities/Transaccion";
import type { Result } from "../shared/Result";

export interface ITransaccionRepository {
  listar(): Promise<Result<Transaccion[]>>;
  obtenerPorId(id: string): Promise<Result<Transaccion>>;
}
