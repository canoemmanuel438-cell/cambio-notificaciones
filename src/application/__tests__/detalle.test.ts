import { describe, expect, it } from "vitest";

import {
  claveDia,
  claveEtapa,
  claveFuente,
  claveSla,
  definirIndicador,
  IDS_PROCESO_SLA,
} from "@/domain/entities/Indicador";
import type { RolId } from "@/domain/entities/Rol";
import { crearDependencias, crearRepositoriosMock } from "@/infrastructure/di/container";
import { AHORA_SIMULADO } from "@/infrastructure/mock/data/generador";
import { crearAlmacenamientoMemoria } from "@/infrastructure/storage/AlmacenamientoNavegador";
import {
  MockAlertaRepository,
  NavegadorSesionRepository,
} from "@/infrastructure/repositories/MockRepositories";
import { crearCasos, transaccionesCaidas } from "./ayudas";

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
const filtros = {
  rango: { desde: "2026-08-27T00:00:00.000Z", hasta: new Date(AHORA_SIMULADO).toISOString() },
};

async function conteo(clave: string, rol: RolId = "OPERACIONES", f = filtros): Promise<number> {
  const r = await crear().obtenerDetalleIndicador.execute(clave, f, rol);
  if (!r.success) throw r.error;
  return r.data.resumen.operaciones;
}

describe("definirIndicador", () => {
  it("resuelve indicadores fijos y parametrizados", () => {
    expect(definirIndicador("autorizadas")?.origen).toBe("EJECUTIVO");
    expect(definirIndicador("pos-rechazadas")?.origen).toBe("POS");
    expect(definirIndicador("atm-retiros")?.origen).toBe("ATM");
    expect(definirIndicador(claveEtapa("COMPENSACION"))?.titulo).toBe("Compensación: completadas");
    expect(definirIndicador(claveFuente("tef"))?.titulo).toContain("Archivos TEF");
    expect(definirIndicador(claveDia("2026-09-20"))?.titulo).toBe("Operaciones del 20/09/2026");
    expect(definirIndicador(claveDia("2026-09-20", "POS"))?.origen).toBe("POS");
  });

  it("rechaza claves desconocidas o mal formadas", () => {
    for (const clave of [
      "",
      "nada",
      "toString",
      "etapa:XX",
      "dia:ayer",
      "dia:2026-09-20:XYZ",
      "fuente:inexistente",
      "fuente",
    ]) {
      expect(definirIndicador(clave), clave).toBeUndefined();
    }
  });
});

describe("detalle de indicadores", () => {
  it("devuelve error tipado si el indicador no existe", async () => {
    const r = await crear().obtenerDetalleIndicador.execute("inventado", filtros, "OPERACIONES");
    expect(!r.success && r.error.name).toBe("IndicadorNoEncontradoError");
  });

  it("valida el rango de fechas y el rol", async () => {
    const casos = crear();
    const invalido = await casos.obtenerDetalleIndicador.execute(
      "autorizadas",
      { rango: { desde: filtros.rango.hasta, hasta: filtros.rango.desde } },
      "OPERACIONES",
    );
    expect(!invalido.success && invalido.error.name).toBe("RangoFechasInvalidoError");
    const rolInexistente = await casos.obtenerDetalleIndicador.execute(
      "autorizadas",
      filtros,
      "NADIE" as RolId,
    );
    expect(!rolInexistente.success && rolInexistente.error.name).toBe("PermisoDenegadoError");
  });

  it("el rol Ejecutivo puede consultar los dashboards a los que tiene acceso", async () => {
    expect(await conteo("autorizadas", "EJECUTIVO")).toBeGreaterThan(0);
  });

  it("coincide con los KPI del dashboard ejecutivo", async () => {
    const resumen = await crear().obtenerResumenEjecutivo.execute(filtros);
    if (!resumen.success) throw resumen.error;
    const { kpis, embudo, volumenDiario, integridad } = resumen.data;
    expect(await conteo("autorizadas")).toBe(kpis.autorizadas);
    expect(await conteo("importe")).toBe(kpis.autorizadas);
    expect(await conteo("pendientes")).toBe(kpis.pendientesEnPlazo);
    expect(await conteo("inconsistencias")).toBe(kpis.conInconsistencia);
    expect(await conteo("duplicados")).toBe(kpis.duplicados);
    expect(await conteo("dc01")).toBe(kpis.dcDelDia.dc01);
    expect(await conteo("dc00")).toBe(kpis.dcDelDia.dc00);
    for (const e of embudo) expect(await conteo(claveEtapa(e.etapa))).toBe(e.cantidad);
    for (const d of volumenDiario) expect(await conteo(claveDia(d.fecha))).toBe(d.total);
    for (const f of integridad) expect(await conteo(f.clave)).toBe(f.registros);
  });

  it("'sin-match' son las autorizadas evaluadas que no cuadran", async () => {
    const r = await crear().obtenerDetalleIndicador.execute("sin-match", filtros, "OPERACIONES");
    if (!r.success) throw r.error;
    expect(r.data.filas.every((f) => f.transaccion.aprobada)).toBe(true);
    expect(r.data.resumen.conInconsistencia).toBeGreaterThan(0);
  });

  it("coincide con los KPI del dashboard POS", async () => {
    const dash = await crear().obtenerDashboardPOS.execute(filtros);
    if (!dash.success) throw dash.error;
    const { kpis, etapas, noCompensados, porDia } = dash.data;
    expect(await conteo("pos-autorizadas")).toBe(kpis.autorizadas);
    expect(await conteo("pos-rechazadas")).toBe(kpis.rechazadas);
    expect(await conteo("pos-completadas")).toBe(kpis.completadas);
    expect(await conteo("pos-pendientes")).toBe(kpis.pendientes);
    expect(await conteo("pos-incidencias")).toBe(kpis.conIncidencia);
    expect(await conteo("pos-no-compensadas")).toBe(noCompensados.conteo);
    expect(await conteo("pos-dc01")).toBe(kpis.dcDelDia.dc01);
    expect(await conteo("pos-dc00")).toBe(kpis.dcDelDia.dc00);
    expect(await conteo("pos-comp-completada")).toBe(etapas.compensacion.completadas);
    expect(await conteo("pos-comp-pendiente")).toBe(etapas.compensacion.pendientes);
    expect(await conteo("pos-posteo-completado")).toBe(etapas.posteo.completadas);
    expect(await conteo("pos-posteo-pendiente")).toBe(etapas.posteo.pendientes);
    expect(await conteo("pos-deposito-completado")).toBe(etapas.deposito.completadas);
    expect(await conteo("pos-deposito-pendiente")).toBe(etapas.deposito.pendientes);
    expect(await conteo("pos-aclaracion-abierta")).toBe(etapas.aclaracion.abiertas);
    expect(await conteo("pos-aclaracion-resuelta")).toBe(etapas.aclaracion.resueltas);
    for (const d of porDia)
      expect(await conteo(claveDia(d.fecha, "POS"))).toBe(d.aprobadas + d.rechazadas);
  });

  it("aplica los filtros globales de origen y circuito en POS", async () => {
    const online = { ...filtros, origen: "ONLINE" as const };
    const dash = await crear().obtenerDashboardPOS.execute(online);
    if (!dash.success) throw dash.error;
    expect(await conteo("pos-autorizadas", "OPERACIONES", online)).toBe(dash.data.kpis.autorizadas);
  });

  it("coincide con los KPI del dashboard ATM", async () => {
    const dash = await crear().obtenerDashboardATM.execute(filtros);
    if (!dash.success) throw dash.error;
    const { resumenTLF, resumenSETL, comparacion, porDia } = dash.data;
    expect(await conteo("atm-total")).toBe(resumenTLF.total);
    expect(await conteo("atm-aprobadas")).toBe(resumenTLF.aprobadas);
    expect(await conteo("atm-rechazadas")).toBe(resumenTLF.rechazadas);
    expect(await conteo("atm-importe")).toBe(resumenTLF.aprobadas);
    expect(await conteo("atm-retiros")).toBe(resumenTLF.retirosAprobados);
    expect(await conteo("atm-liquidadas")).toBe(resumenSETL.conteo);
    expect(await conteo("atm-match")).toBe(comparacion.match);
    expect(await conteo("atm-sin-match")).toBe(comparacion.sinMatch);
    for (const d of porDia)
      expect(await conteo(claveDia(d.fecha, "ATM"))).toBe(d.aprobadas + d.rechazadas);
  });

  it("ordena por fecha reciente, o por importe en los indicadores de importe", async () => {
    const casos = crear();
    const recientes = await casos.obtenerDetalleIndicador.execute(
      "autorizadas",
      filtros,
      "OPERACIONES",
    );
    const porImporte = await casos.obtenerDetalleIndicador.execute(
      "importe",
      filtros,
      "OPERACIONES",
    );
    if (!recientes.success || !porImporte.success) throw new Error("consulta fallida");
    const fechas = recientes.data.filas.map((f) => f.transaccion.fecha);
    expect(fechas).toEqual([...fechas].sort().reverse());
    const montos = porImporte.data.filas.map((f) => f.transaccion.monto);
    expect(montos).toEqual([...montos].sort((a, b) => b - a));
    expect(porImporte.data.resumen.importe).toBeCloseTo(
      montos.reduce((s, m) => s + m, 0),
      2,
    );
  });

  it("registra la consulta en la bitácora", async () => {
    const casos = crear();
    await casos.obtenerDetalleIndicador.execute("duplicados", filtros, "AUDITORIA");
    const bitacora = await casos.obtenerBitacora.execute();
    if (!bitacora.success) throw bitacora.error;
    expect(
      bitacora.data.some((e) => e.evento === "Consulta de detalle" && e.rol === "AUDITORIA"),
    ).toBe(true);
  });
});

describe("exportar detalle", () => {
  it("genera un CSV con las operaciones del indicador", async () => {
    const casos = crear();
    const r = await casos.exportarDetalleIndicador.execute("autorizadas", filtros, "OPERACIONES");
    if (!r.success) throw r.error;
    expect(r.data.nombre).toMatch(/^detalle-autorizadas-.*\.csv$/);
    expect(r.data.registros).toBe(await conteo("autorizadas"));
  });

  it("limpia los caracteres de la clave en el nombre del archivo", async () => {
    const r = await crear().exportarDetalleIndicador.execute(
      claveEtapa("COMPENSACION"),
      filtros,
      "OPERACIONES",
    );
    if (!r.success) throw r.error;
    expect(r.data.nombre).toMatch(/^detalle-etapa-COMPENSACION-/);
  });

  it("exige permiso de descarga", async () => {
    const r = await crear().exportarDetalleIndicador.execute("autorizadas", filtros, "EJECUTIVO");
    expect(!r.success && r.error.name).toBe("PermisoDenegadoError");
  });

  it("falla si el indicador no existe o no hay operaciones", async () => {
    const casos = crear();
    const noExiste = await casos.exportarDetalleIndicador.execute(
      "inventado",
      filtros,
      "OPERACIONES",
    );
    expect(!noExiste.success && noExiste.error.name).toBe("IndicadorNoEncontradoError");
    const vacio = await casos.exportarDetalleIndicador.execute(
      claveDia("2020-01-01"),
      filtros,
      "OPERACIONES",
    );
    expect(!vacio.success && vacio.error.name).toBe("SinDatosParaExportarError");
  });
});

describe("detalle de procesos SLA", () => {
  it("cubre exactamente los procesos que entrega el dashboard de SLA", async () => {
    const sla = await crear().obtenerDashboardSLA.execute();
    if (!sla.success) throw sla.error;
    const ids = sla.data.procesos.map((p) => p.ejecucion.proceso.id).sort();
    expect(ids).toEqual([...IDS_PROCESO_SLA].sort());
  });

  it("devuelve las operaciones de cada proceso con su título y su día", async () => {
    const sla = await crear().obtenerDashboardSLA.execute();
    if (!sla.success) throw sla.error;
    const dia = sla.data.fechaSeleccionada;
    for (const p of sla.data.procesos) {
      const r = await crear().obtenerDetalleIndicador.execute(
        claveSla(p.ejecucion.proceso.id, dia),
        filtros,
        "OPERACIONES",
      );
      if (!r.success) throw r.error;
      expect(r.data.titulo).toContain(p.ejecucion.proceso.nombre);
      expect(r.data.origen).toBe("SLA");
      expect(r.data.dia).toBe(dia);
    }
  });

  it("no depende de los filtros globales", async () => {
    const dia = "2026-09-24";
    const angosto = {
      rango: { desde: "2026-09-25T00:00:00.000Z", hasta: "2026-09-25T09:40:00.000Z" },
      adquirente: "no-existe",
    };
    expect(await conteo(claveSla("TLF", dia), "OPERACIONES", angosto)).toBe(
      await conteo(claveSla("TLF", dia)),
    );
    expect(await conteo(claveSla("TLF", dia))).toBeGreaterThan(0);
  });

  it("detecta duplicados recibidos en algún día y deja vacío un día sin datos", async () => {
    let duplicados = 0;
    for (let d = 12; d <= 25; d += 1)
      duplicados += await conteo(claveSla("DUP_TEF", `2026-09-${String(d).padStart(2, "0")}`));
    expect(duplicados).toBeGreaterThan(0);
    expect(await conteo(claveSla("CARGA_ONLINE", "2020-01-01"))).toBe(0);
  });

  it("el rol sin acceso al SLA no consulta el detalle", async () => {
    const r = await crear().obtenerDetalleIndicador.execute(
      claveSla("TLF", "2026-09-24"),
      filtros,
      "CONCILIACION",
    );
    expect(!r.success && r.error.name).toBe("PermisoDenegadoError");
  });

  it("propaga la falla del origen aunque ignore los filtros", async () => {
    const casos = crearCasos({ transaccion: transaccionesCaidas });
    const r = await casos.obtenerDetalleIndicador.execute(
      claveSla("TLF", "2026-09-24"),
      filtros,
      "OPERACIONES",
    );
    expect(!r.success && r.error.name).toBe("OrigenDatosNoDisponibleError");
  });
});
