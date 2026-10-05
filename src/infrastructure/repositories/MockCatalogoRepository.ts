import type { Catalogos } from "@/domain/entities/Otros";
import { OrigenDatosNoDisponibleError } from "@/domain/errors/DomainErrors";
import type { ICatalogoRepository } from "@/domain/repositories/ICatalogoRepository";
import { fail, ok, type Result } from "@/domain/shared/Result";
import { OperacionMapper } from "@/infrastructure/mappers/OperacionMapper";
import { datasetRaw } from "@/infrastructure/mock/data/generador";

export class MockCatalogoRepository implements ICatalogoRepository {
  constructor(
    private readonly origen: () => Catalogos = () =>
      OperacionMapper.catalogoDesdeRaw(datasetRaw().catalogo),
  ) {}

  async obtener(): Promise<Result<Catalogos>> {
    try {
      return ok(this.origen());
    } catch {
      return fail(new OrigenDatosNoDisponibleError());
    }
  }
}
