import type { EjecucionSLA } from "@/domain/entities/ProcesoSLA";
import { OrigenDatosNoDisponibleError } from "@/domain/errors/DomainErrors";
import type { ISLARepository } from "@/domain/repositories/ISLARepository";
import { fail, ok, type Result } from "@/domain/shared/Result";
import { OperacionMapper } from "@/infrastructure/mappers/OperacionMapper";
import { datasetRaw } from "@/infrastructure/mock/data/generador";

export class MockSLARepository implements ISLARepository {
  constructor(
    private readonly origen: () => EjecucionSLA[] = () => {
      const raw = datasetRaw();
      return OperacionMapper.ejecucionesDesdeRaw(raw.procesos, raw.ejecuciones);
    },
  ) {}

  async listarEjecuciones(): Promise<Result<EjecucionSLA[]>> {
    try {
      return ok(this.origen());
    } catch {
      return fail(new OrigenDatosNoDisponibleError());
    }
  }
}
