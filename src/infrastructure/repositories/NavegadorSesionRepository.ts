import type { Sesion } from "@/domain/entities/Otros";
import type { ISesionRepository } from "@/domain/repositories/ISesionRepository";
import { ok, type Result } from "@/domain/shared/Result";
import type { Almacenamiento } from "@/infrastructure/storage/AlmacenamientoNavegador";

export const CLAVE_SESION = "monitor-pos-atm.sesion";
const VACIA: Sesion = { rolActivo: null, ultimoRol: null };

export class NavegadorSesionRepository implements ISesionRepository {
  constructor(private readonly almacenamiento: Almacenamiento) {}

  async obtener(): Promise<Result<Sesion>> {
    return ok({ ...VACIA, ...this.almacenamiento.leer<Partial<Sesion>>(CLAVE_SESION, VACIA) });
  }

  async guardar(sesion: Sesion): Promise<Result<Sesion>> {
    this.almacenamiento.escribir(CLAVE_SESION, sesion);
    return ok(sesion);
  }
}
