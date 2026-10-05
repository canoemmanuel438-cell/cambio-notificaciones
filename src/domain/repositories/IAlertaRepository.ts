import type { Alerta, EstadoAlerta } from "../entities/Alerta";
import type { Result } from "../shared/Result";

export interface IAlertaRepository {
  listar(): Promise<Result<Alerta[]>>;
  obtenerPorId(id: string): Promise<Result<Alerta>>;
  actualizarEstado(id: string, estado: EstadoAlerta): Promise<Result<Alerta>>;
}
