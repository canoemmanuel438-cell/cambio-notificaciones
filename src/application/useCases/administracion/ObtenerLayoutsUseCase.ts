import {
  coincideLayout,
  type FiltrosLayouts,
  type Layout,
  type ResumenLayouts,
} from "@/domain/entities/Administracion";
import type { IAdministracionRepository } from "@/domain/repositories/IAdministracionRepository";
import type { Reloj } from "@/domain/shared/Reloj";
import { ok, type Result } from "@/domain/shared/Result";

const DIA = 86_400_000;

export class ObtenerLayoutsUseCase {
  constructor(
    private readonly repo: IAdministracionRepository,
    private readonly reloj: Reloj,
  ) {}

  async execute(
    filtros: FiltrosLayouts,
  ): Promise<Result<{ resumen: ResumenLayouts; layouts: Layout[] }>> {
    const r = await this.repo.listarLayouts();
    if (!r.success) return r;
    const todos = r.data;
    const ahora = this.reloj().getTime();
    const resumen: ResumenLayouts = {
      total: todos.length,
      activos: todos.filter((l) => l.activo).length,
      inactivos: todos.filter((l) => !l.activo).length,
      fiids: new Set(todos.flatMap((l) => l.fiids)).size,
      cambios30Dias: todos.filter((l) => ahora - Date.parse(l.ultimaModificacion) <= 30 * DIA)
        .length,
    };
    return ok({ resumen, layouts: todos.filter((l) => coincideLayout(l, filtros)) });
  }
}
