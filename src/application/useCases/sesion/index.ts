import type { Catalogos, EventoBitacora, TipoEvento } from "@/domain/entities/Otros";
import { ROL_PREDETERMINADO, buscarRol, type Rol, type RolId } from "@/domain/entities/Rol";
import { RolInvalidoError } from "@/domain/errors/DomainErrors";
import type { IBitacoraRepository } from "@/domain/repositories/IBitacoraRepository";
import type { ICatalogoRepository } from "@/domain/repositories/ICatalogoRepository";
import type { ISesionRepository } from "@/domain/repositories/ISesionRepository";
import type { Reloj } from "@/domain/shared/Reloj";
import { fail, ok, type Result } from "@/domain/shared/Result";
import { registrar } from "@/application/shared/consultas";

export interface EstadoSesion {
  rol: Rol | null;
  ultimoRol: RolId;
}

export class ObtenerSesionUseCase {
  constructor(private readonly sesion: ISesionRepository) {}

  async execute(): Promise<Result<EstadoSesion>> {
    const resultado = await this.sesion.obtener();
    if (!resultado.success) return resultado;
    const { rolActivo, ultimoRol } = resultado.data;
    return ok({
      rol: rolActivo ? (buscarRol(rolActivo) ?? null) : null,
      ultimoRol: ultimoRol && buscarRol(ultimoRol) ? ultimoRol : ROL_PREDETERMINADO,
    });
  }
}

/** Inicia sesión o cambia de rol: ambos quedan en la bitácora. */
export class IniciarSesionUseCase {
  constructor(
    private readonly sesion: ISesionRepository,
    private readonly bitacora: IBitacoraRepository,
    private readonly relojEventos: Reloj,
  ) {}

  async execute(rolId: string): Promise<Result<Rol>> {
    const rol = buscarRol(rolId);
    if (!rol) return fail(new RolInvalidoError(rolId));
    const previa = await this.sesion.obtener();
    const anterior = previa.success ? previa.data.rolActivo : null;
    const guardado = await this.sesion.guardar({ rolActivo: rol.id, ultimoRol: rol.id });
    if (!guardado.success) return guardado;
    const evento: TipoEvento = anterior ? "Cambio de rol" : "Inicio de sesión";
    const detalle = anterior
      ? `${buscarRol(anterior)?.nombre ?? anterior} → ${rol.nombre}`
      : `Rol ${rol.nombre}`;
    await registrar(this.bitacora, this.relojEventos, rol.id, evento, detalle);
    return ok(rol);
  }
}

export class CerrarSesionUseCase {
  constructor(
    private readonly sesion: ISesionRepository,
    private readonly bitacora: IBitacoraRepository,
    private readonly relojEventos: Reloj,
  ) {}

  async execute(): Promise<Result<true>> {
    const previa = await this.sesion.obtener();
    if (!previa.success) return previa;
    const { rolActivo, ultimoRol } = previa.data;
    if (rolActivo)
      await registrar(
        this.bitacora,
        this.relojEventos,
        rolActivo,
        "Cierre de sesión",
        "Sesión finalizada",
      );
    const guardado = await this.sesion.guardar({
      rolActivo: null,
      ultimoRol: ultimoRol ?? rolActivo,
    });
    return guardado.success ? ok(true) : guardado;
  }
}

export class RegistrarEventoUseCase {
  constructor(
    private readonly bitacora: IBitacoraRepository,
    private readonly relojEventos: Reloj,
  ) {}

  async execute(rol: RolId, evento: TipoEvento, detalle: string): Promise<Result<EventoBitacora>> {
    return this.bitacora.registrar({
      fecha: this.relojEventos().toISOString(),
      rol,
      evento,
      detalle,
    });
  }
}

export class ObtenerBitacoraUseCase {
  constructor(private readonly bitacora: IBitacoraRepository) {}

  async execute(): Promise<Result<EventoBitacora[]>> {
    const resultado = await this.bitacora.listar();
    if (!resultado.success) return resultado;
    return ok(
      [...resultado.data].sort(
        (a, b) => b.fecha.localeCompare(a.fecha) || b.id.localeCompare(a.id),
      ),
    );
  }
}

export class ObtenerCatalogosUseCase {
  constructor(private readonly catalogos: ICatalogoRepository) {}

  execute(): Promise<Result<Catalogos>> {
    return this.catalogos.obtener();
  }
}
