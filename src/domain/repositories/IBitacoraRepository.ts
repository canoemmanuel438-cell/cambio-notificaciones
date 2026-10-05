import type { EventoBitacora, NuevoEventoBitacora } from "../entities/Otros";
import type { Result } from "../shared/Result";

export interface IBitacoraRepository {
  registrar(evento: NuevoEventoBitacora): Promise<Result<EventoBitacora>>;
  listar(): Promise<Result<EventoBitacora[]>>;
}
