import { describe, expect, it } from "vitest";

import { ActualizarParametroUseCase } from "@/application/useCases/configuracion/ActualizarParametroUseCase";
import { ObtenerParametrosUseCase } from "@/application/useCases/configuracion/ObtenerParametrosUseCase";
import { estaVencida, estatusTransaccion } from "@/domain/entities/Transaccion";
import {
  crearDependencias,
  crearRelojesSimulados,
  crearRepositoriosMock,
} from "@/infrastructure/di/container";
import {
  MemoriaBitacoraRepository,
  NavegadorParametroRepository,
} from "@/infrastructure/repositories/MockRepositories";
import { crearAlmacenamientoMemoria } from "@/infrastructure/storage/AlmacenamientoNavegador";

const ahora = crearRelojesSimulados().datos;

describe("ajustes puntuales", () => {
  it("genera transacciones vencidas con estatus Vencida", async () => {
    const repo = crearRepositoriosMock().transaccion;
    const r = await repo.listar();
    if (!r.success) throw r.error;
    const vencidas = r.data.filter((t) => estaVencida(t, ahora()));
    expect(vencidas.length).toBeGreaterThan(0);
    expect(vencidas.every((t) => estatusTransaccion(t, ahora()) === "VENCIDA")).toBe(true);
    expect(
      r.data.every((t) => t.archivoOrigen && ["210", "220", "420"].includes(t.tipoMensaje)),
    ).toBe(true);
  });

  it("filtra trazabilidad por estatus y reporta DC01/DC00 y EPAPE", async () => {
    const { casosDeUso } = crearDependencias();
    const r = await casosDeUso.buscarTransacciones.execute({ estatus: "VENCIDA" }, "OPERACIONES");
    if (!r.success) throw r.error;
    expect(r.data.length).toBeGreaterThan(0);
    expect(r.data.every((f) => f.estatus === "VENCIDA")).toBe(true);
    const e = await casosDeUso.obtenerResumenEjecutivo.execute({
      rango: { desde: "2026-07-28T00:00:00.000Z", hasta: "2026-09-25T09:40:00.000Z" },
    });
    if (!e.success) throw e.error;
    expect(e.data.kpis.dcDelDia.dc01 + e.data.kpis.dcDelDia.dc00).toBeGreaterThan(0);
    expect(e.data.integridad.find((f) => f.fuente.startsWith("EPAPE"))?.estado).toBe("INCUMPLIDO");
    const nm = await casosDeUso.obtenerReporteNoMatch.execute("AUTORIZADAS_NO_COMPENSADAS");
    if (!nm.success) throw nm.error;
    expect(nm.data.filas[0]?.archivo).toBeTruthy();
  });

  it("respeta permisos de edición de parámetros y registra en bitácora", async () => {
    const parametros = new NavegadorParametroRepository(crearAlmacenamientoMemoria());
    const bitacora = new MemoriaBitacoraRepository();
    const actualizar = new ActualizarParametroUseCase(parametros, bitacora, ahora);
    expect((await actualizar.execute("plazo_debito", 45, "OPERACIONES")).success).toBe(false);
    expect((await actualizar.execute("umbral_rechazo", 10, "OPERACIONES")).success).toBe(true);
    expect((await actualizar.execute("plazo_debito", 45, "AUDITORIA")).success).toBe(false);
    expect((await actualizar.execute("plazo_debito", 0, "ADMINISTRADOR")).success).toBe(false);
    expect((await actualizar.execute("no_existe", 1, "ADMINISTRADOR")).success).toBe(false);
    expect((await actualizar.execute("plazo_debito", 45, "ADMINISTRADOR")).success).toBe(true);
    const lista = await new ObtenerParametrosUseCase(parametros).execute("OPERACIONES");
    if (!lista.success) throw lista.error;
    expect(lista.data.find((g) => g.grupo === "UMBRALES_ALERTA")?.editable).toBe(true);
    expect(lista.data.find((g) => g.grupo === "PLAZOS")?.parametros[0]?.valor).toBe(45);
    const eventos = await bitacora.listar();
    expect(
      eventos.success && eventos.data.filter((x) => x.evento === "Cambio de parámetro").length,
    ).toBe(2);
  });
});
