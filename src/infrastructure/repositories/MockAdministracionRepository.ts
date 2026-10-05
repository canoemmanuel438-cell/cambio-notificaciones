import type { Layout, ModeloSemantico, PosturaSeguridad } from "@/domain/entities/Administracion";
import { OrigenDatosNoDisponibleError } from "@/domain/errors/DomainErrors";
import type { IAdministracionRepository } from "@/domain/repositories/IAdministracionRepository";
import { fail, ok, type Result } from "@/domain/shared/Result";
import { AdministracionMapper } from "@/infrastructure/mappers/AdministracionMapper";
import {
  LAYOUTS_RAW,
  MODELO_SEMANTICO_RAW,
  POSTURA_SEGURIDAD_RAW,
} from "@/infrastructure/mock/data/administracion";

const intentar = <T>(fn: () => T): Result<T> => {
  try {
    return ok(fn());
  } catch {
    return fail(new OrigenDatosNoDisponibleError());
  }
};

export class MockAdministracionRepository implements IAdministracionRepository {
  async listarLayouts(): Promise<Result<Layout[]>> {
    return intentar(() => LAYOUTS_RAW.map(AdministracionMapper.layout));
  }
  async obtenerModeloSemantico(): Promise<Result<ModeloSemantico>> {
    return intentar(() => AdministracionMapper.modelo(MODELO_SEMANTICO_RAW));
  }
  async obtenerPosturaSeguridad(): Promise<Result<PosturaSeguridad>> {
    return intentar(() => AdministracionMapper.postura(POSTURA_SEGURIDAD_RAW));
  }
}
