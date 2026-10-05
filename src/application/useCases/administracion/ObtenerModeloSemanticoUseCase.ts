import type { ModeloSemantico } from "@/domain/entities/Administracion";
import type { IAdministracionRepository } from "@/domain/repositories/IAdministracionRepository";
import type { Result } from "@/domain/shared/Result";

export class ObtenerModeloSemanticoUseCase {
  constructor(private readonly repo: IAdministracionRepository) {}

  execute(): Promise<Result<ModeloSemantico>> {
    return this.repo.obtenerModeloSemantico();
  }
}
