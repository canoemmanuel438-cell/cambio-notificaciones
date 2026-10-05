import type { RecepcionArchivo } from "@/domain/entities/Otros";
import { OrigenDatosNoDisponibleError } from "@/domain/errors/DomainErrors";
import type { IArchivoRepository } from "@/domain/repositories/IArchivoRepository";
import { fail, ok, type Result } from "@/domain/shared/Result";
import { OperacionMapper } from "@/infrastructure/mappers/OperacionMapper";
import { datasetRaw } from "@/infrastructure/mock/data/generador";

export class MockArchivoRepository implements IArchivoRepository {
  constructor(
    private readonly origen: () => RecepcionArchivo[] = () =>
      datasetRaw().recepciones.map(OperacionMapper.recepcionDesdeRaw),
  ) {}

  async listarRecepciones(): Promise<Result<RecepcionArchivo[]>> {
    try {
      return ok(this.origen());
    } catch {
      return fail(new OrigenDatosNoDisponibleError());
    }
  }
}
