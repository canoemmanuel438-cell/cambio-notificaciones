import type { EventoBitacora, NuevoEventoBitacora } from "@/domain/entities/Otros";
import type { IBitacoraRepository } from "@/domain/repositories/IBitacoraRepository";
import { ok, type Result } from "@/domain/shared/Result";

/** Bitácora de la sesión en memoria (en producción: Cloud Logging). */
export class MemoriaBitacoraRepository implements IBitacoraRepository {
  private readonly eventos: EventoBitacora[] = [];

  async registrar(evento: NuevoEventoBitacora): Promise<Result<EventoBitacora>> {
    const nuevo = { ...evento, id: `EV-${String(this.eventos.length + 1).padStart(5, "0")}` };
    this.eventos.push(nuevo);
    return ok(nuevo);
  }

  async listar(): Promise<Result<EventoBitacora[]>> {
    return ok([...this.eventos]);
  }
}
