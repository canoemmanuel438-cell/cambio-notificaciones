import type { Layout, ModeloSemantico, PosturaSeguridad } from "../entities/Administracion";
import type { Result } from "../shared/Result";

export interface IAdministracionRepository {
  listarLayouts(): Promise<Result<Layout[]>>;
  obtenerModeloSemantico(): Promise<Result<ModeloSemantico>>;
  obtenerPosturaSeguridad(): Promise<Result<PosturaSeguridad>>;
}
