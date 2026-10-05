import type { PosturaSeguridad } from "@/domain/entities/Administracion";
import type { IAdministracionRepository } from "@/domain/repositories/IAdministracionRepository";
import { ok, type Result } from "@/domain/shared/Result";

export class ObtenerPosturaSeguridadUseCase {
  constructor(private readonly repo: IAdministracionRepository) {}

  async execute(): Promise<Result<PosturaSeguridad & { activos: number }>> {
    const r = await this.repo.obtenerPosturaSeguridad();
    if (!r.success) return r;
    return ok({ ...r.data, activos: r.data.controles.filter((c) => c.activo).length });
  }
}
