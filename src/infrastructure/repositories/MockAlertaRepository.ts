import type { Alerta, EstadoAlerta } from "@/domain/entities/Alerta";
import {
  AlertaNoEncontradaError,
  OrigenDatosNoDisponibleError,
} from "@/domain/errors/DomainErrors";
import type { IAlertaRepository } from "@/domain/repositories/IAlertaRepository";
import { fail, ok, type Result } from "@/domain/shared/Result";
import { AlertaMapper } from "@/infrastructure/mappers/AlertaMapper";
import { datasetRaw } from "@/infrastructure/mock/data/generador";
import type { Almacenamiento } from "@/infrastructure/storage/AlmacenamientoNavegador";

export const CLAVE_ESTADOS_ALERTAS = "monitor-pos-atm.alertas.estados";

/** Alertas del simulador + cambios de estado persistidos en el navegador. */
export class MockAlertaRepository implements IAlertaRepository {
  constructor(
    private readonly almacenamiento: Almacenamiento,
    private readonly origen: () => Alerta[] = () =>
      AlertaMapper.listaDesdeRaw(datasetRaw().alertas),
  ) {}

  private cargar(): Alerta[] {
    const cambios = this.almacenamiento.leer<Record<string, EstadoAlerta>>(
      CLAVE_ESTADOS_ALERTAS,
      {},
    );
    return this.origen().map((a) => (cambios[a.id] ? { ...a, estado: cambios[a.id]! } : a));
  }

  async listar(): Promise<Result<Alerta[]>> {
    try {
      return ok(this.cargar());
    } catch {
      return fail(new OrigenDatosNoDisponibleError());
    }
  }

  async obtenerPorId(id: string): Promise<Result<Alerta>> {
    const lista = await this.listar();
    if (!lista.success) return lista;
    const alerta = lista.data.find((a) => a.id === id);
    return alerta ? ok(alerta) : fail(new AlertaNoEncontradaError(id));
  }

  async actualizarEstado(id: string, estado: EstadoAlerta): Promise<Result<Alerta>> {
    const actual = await this.obtenerPorId(id);
    if (!actual.success) return actual;
    const cambios = this.almacenamiento.leer<Record<string, EstadoAlerta>>(
      CLAVE_ESTADOS_ALERTAS,
      {},
    );
    this.almacenamiento.escribir(CLAVE_ESTADOS_ALERTAS, { ...cambios, [id]: estado });
    return ok({ ...actual.data, estado });
  }
}
