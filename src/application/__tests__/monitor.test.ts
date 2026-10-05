import { describe, expect, it } from "vitest";

import { crearDependencias, crearRepositoriosMock } from "@/infrastructure/di/container";
import { AHORA_SIMULADO, generarDataset } from "@/infrastructure/mock/data/generador";
import { crearAlmacenamientoMemoria } from "@/infrastructure/storage/AlmacenamientoNavegador";
import {
  MockAlertaRepository,
  NavegadorSesionRepository,
} from "@/infrastructure/repositories/MockRepositories";
import { enmascararPAN, plazoPresentacion, type Transaccion } from "@/domain/entities/Transaccion";
import { estadoEjecucion, type EjecucionSLA } from "@/domain/entities/ProcesoSLA";
import { esTransicionValida } from "@/domain/entities/Alerta";

const relojes = { datos: () => new Date(AHORA_SIMULADO), eventos: () => new Date(AHORA_SIMULADO) };
const crear = () => {
  const almacen = crearAlmacenamientoMemoria();
  const repos = {
    ...crearRepositoriosMock(),
    alerta: new MockAlertaRepository(almacen),
    sesion: new NavegadorSesionRepository(almacen),
  };
  return crearDependencias(repos, relojes).casosDeUso;
};
const rango30 = {
  rango: { desde: "2026-08-27T00:00:00.000Z", hasta: new Date(AHORA_SIMULADO).toISOString() },
};

describe("simulador", () => {
  it("es determinista y genera 8 duplicados y el SETL faltante", () => {
    const a = generarDataset();
    const b = generarDataset();
    expect(a.transacciones.length).toBe(b.transacciones.length);
    expect(a.transacciones.filter((t) => t.dup?.role === "DUPLICADO")).toHaveLength(8);
    expect(a.recepciones.find((r) => r.source === "SETL" && !r.received)?.data_date).toBe(
      "2026-09-24",
    );
  });
});

describe("dominio", () => {
  it("enmascara el PAN", () =>
    expect(enmascararPAN("5579101234561234")).toBe("5579 10•• •••• 1234"));
  it("calcula plazo débito 30 / crédito 120", () => {
    const t = { fecha: "2026-09-15T10:00:00.000Z", tipoTarjeta: "DEBITO" } as Transaccion;
    expect(plazoPresentacion(t, new Date(AHORA_SIMULADO)).diasRestantes).toBe(21);
    expect(
      plazoPresentacion({ ...t, tipoTarjeta: "CREDITO" }, new Date(AHORA_SIMULADO)).diasRestantes,
    ).toBe(111);
  });
  it("evalúa SLA por duración y hora límite", () => {
    const dur = {
      proceso: { id: "x", nombre: "x", tipo: "DURACION", limiteMin: 45 },
      fecha: "",
      programadoMin: 0,
    } as EjecucionSLA;
    expect(estadoEjecucion({ ...dur, p95: 44 }, null)).toBe("EN_RIESGO");
    expect(estadoEjecucion({ ...dur, p95: 30 }, null)).toBe("EN_TIEMPO");
    expect(estadoEjecucion({ ...dur, p95: 50 }, null)).toBe("INCUMPLIDO");
    const hora = {
      ...dur,
      proceso: { ...dur.proceso, tipo: "HORA_LIMITE", limiteMin: 420 },
    } as EjecucionSLA;
    expect(estadoEjecucion(hora, 580)).toBe("INCUMPLIDO");
    expect(estadoEjecucion(hora, 400)).toBe("PROGRAMADO");
  });
  it("valida transiciones de alertas", () => {
    expect(esTransicionValida("ABIERTA", "EN_ATENCION")).toBe(true);
    expect(esTransicionValida("CERRADA", "EN_ATENCION")).toBe(false);
  });
});

describe("casos de uso", () => {
  it("resumen ejecutivo marca SETL incumplido", async () => {
    const r = await crear().obtenerResumenEjecutivo.execute(rango30);
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.integridad.find((f) => f.fuente === "Archivo SETL")?.estado).toBe("INCUMPLIDO");
    expect(r.data.embudo).toHaveLength(5);
  });

  it("rechaza rangos inválidos", async () => {
    const r = await crear().obtenerDashboardPOS.execute({
      rango: { desde: "2026-09-20", hasta: "2026-09-01" },
    });
    expect(r.success).toBe(false);
  });

  it("SLA de hoy: SETL incumplido, ETL en riesgo y envío programado", async () => {
    const r = await crear().obtenerDashboardSLA.execute();
    if (!r.success) throw r.error;
    const estado = (id: string) =>
      r.data.procesos.find((p) => p.ejecucion.proceso.id === id)?.estado;
    expect(estado("SETL")).toBe("INCUMPLIDO");
    expect(estado("ETL_COMP")).toBe("EN_RIESGO");
    expect(estado("ENVIO_INT")).toBe("PROGRAMADO");
  });

  it("búsqueda exige criterios y encuentra duplicados", async () => {
    const cu = crear();
    expect((await cu.buscarTransacciones.execute({}, "OPERACIONES")).success).toBe(false);
    const ej = await cu.obtenerEjemplosBusqueda.execute();
    if (!ej.success) throw ej.error;
    const dup = ej.data.find((e) => e.etiqueta === "Duplicada")!;
    const r = await cu.buscarTransacciones.execute(dup.criterios, "OPERACIONES");
    if (!r.success) throw r.error;
    expect(r.data[0]?.clase).toBe("DUPLICADA");
    const ficha = await cu.obtenerFichaTransaccion.execute(
      r.data[0]!.transaccion.id,
      "OPERACIONES",
    );
    if (!ficha.success) throw ficha.error;
    expect(ficha.data.mensajes[0]?.texto).toMatch(/Registro duplicado/);
  });

  it("respeta permisos de descarga y de atención de alertas", async () => {
    const cu = crear();
    expect((await cu.exportarAlertas.execute({ estado: "TODAS" }, "AUDITORIA")).success).toBe(
      false,
    );
    const ok = await cu.exportarAlertas.execute({ estado: "TODAS" }, "ADMINISTRADOR");
    expect(ok.success && ok.data.nombre.endsWith(".xls")).toBe(true);
    const bandeja = await cu.obtenerAlertas.execute({ estado: "ABIERTA" });
    if (!bandeja.success) throw bandeja.error;
    const id = bandeja.data.alertas[0]!.id;
    expect((await cu.cambiarEstadoAlerta.execute(id, "EN_ATENCION", "CONCILIACION")).success).toBe(
      false,
    );
    expect((await cu.cambiarEstadoAlerta.execute(id, "EN_ATENCION", "OPERACIONES")).success).toBe(
      true,
    );
    const bitacora = await cu.obtenerBitacora.execute();
    expect(
      bitacora.success && bitacora.data.some((e) => e.evento === "Cambio de estado de alerta"),
    ).toBe(true);
  });

  it("sesión recuerda el último rol", async () => {
    const cu = crear();
    await cu.iniciarSesion.execute("CONCILIACION");
    await cu.cerrarSesion.execute();
    const s = await cu.obtenerSesion.execute();
    expect(s.success && s.data.rol === null && s.data.ultimoRol === "CONCILIACION").toBe(true);
  });

  it("reporte No Match separa categorías", async () => {
    const r = await crear().obtenerReporteNoMatch.execute("COMPENSADAS_SIN_AUTORIZACION");
    if (!r.success) throw r.error;
    expect(r.data.filas.length).toBeGreaterThan(0);
    expect(
      r.data.filas.every((f) => f.transaccion.inconsistencia === "COMPENSADA_SIN_AUTORIZACION"),
    ).toBe(true);
  });
});
