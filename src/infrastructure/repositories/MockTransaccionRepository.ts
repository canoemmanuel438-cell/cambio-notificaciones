import type { Transaccion } from "@/domain/entities/Transaccion";
import {
  OrigenDatosNoDisponibleError,
  TransaccionNoEncontradaError,
} from "@/domain/errors/DomainErrors";
import type { ITransaccionRepository } from "@/domain/repositories/ITransaccionRepository";
import { fail, ok, type Result } from "@/domain/shared/Result";
import { TransaccionMapper } from "@/infrastructure/mappers/TransaccionMapper";
import { datasetRaw } from "@/infrastructure/mock/data/generador";

/** Thin adapter: lee el simulador, mapea y devuelve Result. */
export class MockTransaccionRepository implements ITransaccionRepository {
  private cache: Transaccion[] | null = null;

  constructor(
    private readonly origen: () => Transaccion[] = () =>
      TransaccionMapper.listaDesdeRaw(datasetRaw().transacciones),
  ) {}

  private cargar(): Transaccion[] {
    this.cache ??= this.origen();
    return this.cache;
  }

  async listar(): Promise<Result<Transaccion[]>> {
    try {
      return ok(this.cargar());
    } catch {
      return fail(new OrigenDatosNoDisponibleError());
    }
  }

  async obtenerPorId(id: string): Promise<Result<Transaccion>> {
    try {
      const t = this.cargar().find((x) => x.id === id);
      return t ? ok(t) : fail(new TransaccionNoEncontradaError(id));
    } catch {
      return fail(new OrigenDatosNoDisponibleError());
    }
  }
}
