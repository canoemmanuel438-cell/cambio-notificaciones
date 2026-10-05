import { describe, expect, it } from "vitest";

import {
  construirFicha,
  lineasFicha,
  mensajesFicha,
  filaTrazabilidad,
} from "@/application/services/FichaService";
import { FormatoExportacionService } from "@/application/services/FormatoExportacionService";
import type { Transaccion } from "@/domain/entities/Transaccion";
import { crearRepositoriosMock } from "@/infrastructure/di/container";
import {
  AHORA,
  alertasCaidas,
  archivosCaidos,
  crearCasos,
  errorOrigen,
  filtros30,
  slaCaido,
  transaccionesCaidas,
  txBase,
} from "./ayudas";

type Resultado = { success: boolean; data?: unknown; error?: Error };
const ok = <T>(r: Resultado): T => {
  if (!r.success) throw r.error;
  return r.data as T;
};
const nombreError = (r: { success: boolean; error?: Error }) => (r.success ? null : r.error?.name);

describe("servicio de formato de exportación", () => {
  const f = new FormatoExportacionService();

  it("escapa CSV, Excel y PDF", () => {
    expect(
      f.aCSV({
        columnas: ["a", "b"],
        filas: [
          ['di"jo', "x,y"],
          [1, "z"],
        ],
      }),
    ).toBe('﻿a,b\n"di""jo","x,y"\n1,z');
    const xls = f.aExcel(
      { columnas: ["n"], filas: [[1], ['<&>"']] },
      "una-hoja-con-nombre-demasiado-largo-para-excel",
    );
    expect(xls).toContain('ss:Type="Number"');
    expect(xls).toContain("&lt;&amp;&gt;&quot;");
    const pdf = f.aPDF(
      "Título (1) \\ — • ñ",
      Array.from({ length: 60 }, (_, i) => `línea ${i}`),
    );
    expect(pdf.startsWith("%PDF-1.4")).toBe(true);
    expect(pdf).toContain("\\(1\\)");
    expect(pdf).not.toContain("línea 55");
  });

  it("genera archivos con nombre y metadatos", () => {
    const csv = f.csv("x", { columnas: ["a"], filas: [[1]] }, AHORA);
    expect(csv).toMatchObject({
      mime: "text/csv;charset=utf-8",
      codificacion: "utf8",
      registros: 1,
    });
    expect(csv.nombre).toBe("x-2026-09-25-09-40.csv");
    expect(f.excel("y", { columnas: ["a"], filas: [] }, AHORA)).toMatchObject({
      mime: "application/vnd.ms-excel",
      registros: 0,
    });
    expect(f.pdf("z", "T", ["l"], AHORA)).toMatchObject({
      mime: "application/pdf",
      codificacion: "latin1",
      registros: 1,
    });
  });
});

describe("ficha de transacción", () => {
  const ficha = (t: Transaccion) => filaTrazabilidad(t, AHORA);
  const textos = (t: Transaccion) => mensajesFicha(ficha(t)).map((m) => m.texto);
  const inconsistente = (tipo: Transaccion["inconsistencia"], cambios: Partial<Transaccion> = {}) =>
    txBase({
      inconsistencia: tipo,
      etapas: [{ etapa: "COMPENSACION", estado: "INCONSISTENCIA", fuente: "x" }],
      ...cambios,
    });

  it("explica una transacción rechazada con y sin motivo", () => {
    expect(
      textos(
        txBase({
          aprobada: false,
          motivoRechazo: { codigo: "51", descripcion: "Fondos insuficientes" },
        }),
      )[0],
    ).toContain("51 Fondos insuficientes");
    expect(textos(txBase({ aprobada: false }))[0]).toBe("Transacción rechazada en autorización.");
  });

  it("explica duplicados", () => {
    const registro = { archivo: "a", linea: 1, horaRecepcion: "2026-09-20T10:00:00.000Z" };
    expect(
      textos(
        txBase({
          duplicidad: { llavePET: "K", rol: "DUPLICADO", contraparteId: "TX-0", registro },
        }),
      )[0],
    ).toContain("duplicado de TX-0");
    expect(
      textos(
        txBase({ duplicidad: { llavePET: "K", rol: "ORIGINAL", contraparteId: "TX-2", registro } }),
      )[0],
    ).toContain("tiene un duplicado: TX-2");
  });

  it("explica cada tipo de inconsistencia", () => {
    expect(textos(inconsistente("AUTORIZADA_SIN_COMPENSAR"))[0]).toContain("Quedan");
    expect(
      textos(inconsistente("AUTORIZADA_SIN_COMPENSAR", { fecha: "2026-06-01T10:00:00.000Z" }))[0],
    ).toContain("vencido");
    expect(textos(inconsistente("DISCREPANCIA_IMPORTE", { importeCompensado: 90 }))[0]).toContain(
      "no coincide",
    );
    expect(textos(inconsistente("DISCREPANCIA_IMPORTE"))[0]).toContain("no coincide");
    expect(textos(inconsistente("COMPENSADA_SIN_AUTORIZACION"))[0]).toContain(
      "sin una autorización",
    );
    expect(textos(inconsistente("SIN_MATCH_TLF_STATS"))[0]).toContain("STATS");
    expect(textos(inconsistente("INCONSISTENCIA_LIQUIDACION"))[0]).toContain("liquidación");
    expect(textos(inconsistente("RECHAZO_INTERCAMBIO"))[0]).toContain("intercambio");
    expect(textos(inconsistente("FALLO_ENVIO"))[0]).toContain("envío");
    expect(textos(inconsistente("PLAZO_VENCIDO"))).toEqual(
      expect.arrayContaining([expect.stringContaining("Vencida")]),
    );
    expect(textos(inconsistente("DUPLICADO"))).toEqual([]);
  });

  it("marca vencidas, ciclos completos y pendientes", () => {
    expect(
      textos(
        txBase({
          fecha: "2026-06-01T10:00:00.000Z",
          etapas: [{ etapa: "COMPENSACION", estado: "PENDIENTE", fuente: "x" }],
        }),
      )[0],
    ).toContain("Vencida");
    expect(textos(txBase())[0]).toContain("Ciclo conciliado");
    expect(
      textos(txBase({ etapas: [{ etapa: "COMPENSACION", estado: "PENDIENTE", fuente: "x" }] }))[0],
    ).toContain("En proceso dentro del plazo");
  });

  it("arma el cruce y las líneas de exportación", () => {
    const original = txBase({
      id: "TX-A",
      duplicidad: {
        llavePET: "K1",
        rol: "ORIGINAL",
        contraparteId: "TX-B",
        registro: { archivo: "a", linea: 1, horaRecepcion: "2026-09-20T10:00:00.000Z" },
      },
    });
    const f = construirFicha(original, AHORA, txBase({ id: "TX-B" }));
    expect(f.cruce.map((c) => c.proceso)).toEqual([
      "Autorización",
      "Compensación",
      "Liquidación",
      "Intercambio",
    ]);
    expect(f.cruce[2]).toMatchObject({ fuente: "—", archivo: "—", estado: "NO_APLICA" });
    expect(f.contraparte?.id).toBe("TX-B");
    const lineas = lineasFicha(f);
    expect(lineas).toContain("ID: TX-A");
    expect(lineas).toContain("Llave PET: K1");
    const sinAut = lineasFicha(
      construirFicha(txBase({ autorizacion: "", archivoOrigen: "" }), AHORA),
    );
    expect(sinAut).toContain("Autorización: —");
    expect(sinAut).toContain("Archivo de origen: —");
  });
});

const primerAdquirente = async (casos: ReturnType<typeof crearCasos>) =>
  ok<{ adquirentes: { nombre: string }[] }>(await casos.obtenerCatalogos.execute()).adquirentes[0]!
    .nombre;

describe("trazabilidad", () => {
  it("rechaza búsquedas sin criterios", async () => {
    const r = await crearCasos().buscarTransacciones.execute({}, "OPERACIONES");
    expect(nombreError(r)).toBe("CriteriosBusquedaVaciosError");
  });

  it("busca por id y por estatus, y registra en bitácora", async () => {
    const casos = crearCasos();
    const ejemplos = ok<{ criterios: object }[]>(await casos.obtenerEjemplosBusqueda.execute());
    expect(ejemplos.length).toBeGreaterThan(0);
    for (const e of ejemplos) {
      const r = ok<unknown[]>(await casos.buscarTransacciones.execute(e.criterios, "OPERACIONES"));
      expect(r.length).toBeGreaterThan(0);
    }
    const adquirente = await primerAdquirente(casos);
    const todas = ok<{ transaccion: Transaccion }[]>(
      await casos.buscarTransacciones.execute({ adquirente }, "AUDITORIA"),
    );
    const soloMatch = ok<{ estatus: string }[]>(
      await casos.buscarTransacciones.execute({ adquirente, estatus: "MATCH" }, "AUDITORIA"),
    );
    expect(soloMatch.length).toBeLessThan(todas.length);
    expect(soloMatch.every((f) => f.estatus === "MATCH")).toBe(true);
    const bitacora = ok<{ evento: string }[]>(await casos.obtenerBitacora.execute());
    expect(bitacora.filter((e) => e.evento === "Búsqueda")).toHaveLength(ejemplos.length + 2);
  });

  it("propaga el error si el origen de datos falla", async () => {
    const casos = crearCasos({ transaccion: transaccionesCaidas });
    expect(nombreError(await casos.buscarTransacciones.execute({ id: "x" }, "OPERACIONES"))).toBe(
      "OrigenDatosNoDisponibleError",
    );
    expect(nombreError(await casos.obtenerFichaTransaccion.execute("x", "OPERACIONES"))).toBe(
      "OrigenDatosNoDisponibleError",
    );
    expect(nombreError(await casos.exportarTrazabilidad.execute({ id: "x" }, "OPERACIONES"))).toBe(
      "OrigenDatosNoDisponibleError",
    );
    expect(nombreError(await casos.exportarFicha.execute("x", "PDF", "OPERACIONES"))).toBe(
      "OrigenDatosNoDisponibleError",
    );
    expect(nombreError(await casos.obtenerEjemplosBusqueda.execute())).toBe(
      "OrigenDatosNoDisponibleError",
    );
  });

  it("abre la ficha con su contraparte duplicada", async () => {
    const casos = crearCasos();
    const ejemplos = ok<{ etiqueta: string; criterios: { id?: string } }[]>(
      await casos.obtenerEjemplosBusqueda.execute(),
    );
    const id = ejemplos.find((e) => e.etiqueta === "Duplicada")!.criterios.id!;
    const ficha = ok<{ contraparte?: Transaccion }>(
      await casos.obtenerFichaTransaccion.execute(id, "OPERACIONES"),
    );
    expect(ficha.contraparte).toBeDefined();
    expect(
      nombreError(await casos.obtenerFichaTransaccion.execute("NO-EXISTE", "OPERACIONES")),
    ).toBe("TransaccionNoEncontradaError");
  });

  it("exporta búsquedas y fichas con control de permiso", async () => {
    const casos = crearCasos();
    const adquirente = await primerAdquirente(casos);
    const csv = ok<{ nombre: string }>(
      await casos.exportarTrazabilidad.execute({ adquirente }, "OPERACIONES"),
    );
    expect(csv.nombre).toMatch(/^trazabilidad-.*\.csv$/);
    expect(nombreError(await casos.exportarTrazabilidad.execute({ adquirente }, "EJECUTIVO"))).toBe(
      "PermisoDenegadoError",
    );
    expect(
      nombreError(await casos.exportarTrazabilidad.execute({ id: "NO-EXISTE" }, "OPERACIONES")),
    ).toBe("SinDatosParaExportarError");

    const ejemplos = ok<{ criterios: { id?: string; autorizacion?: string; fecha?: string } }[]>(
      await casos.obtenerEjemplosBusqueda.execute(),
    );
    const fila = ok<{ transaccion: Transaccion }[]>(
      await casos.buscarTransacciones.execute(ejemplos[0]!.criterios, "OPERACIONES"),
    )[0]!;
    expect(
      ok<{ nombre: string }>(
        await casos.exportarFicha.execute(fila.transaccion.id, "PDF", "OPERACIONES"),
      ).nombre,
    ).toMatch(/\.pdf$/);
    expect(
      ok<{ nombre: string }>(
        await casos.exportarFicha.execute(fila.transaccion.id, "EXCEL", "OPERACIONES"),
      ).nombre,
    ).toMatch(/\.xls$/);
    expect(
      nombreError(await casos.exportarFicha.execute(fila.transaccion.id, "PDF", "EJECUTIVO")),
    ).toBe("PermisoDenegadoError");
    expect(nombreError(await casos.exportarFicha.execute("NO-EXISTE", "PDF", "OPERACIONES"))).toBe(
      "TransaccionNoEncontradaError",
    );
  });
});

describe("alertas", () => {
  it("filtra la bandeja y calcula KPI", async () => {
    const casos = crearCasos();
    const todas = ok<{
      alertas: { grupo: string; etapa: string; severidad: string; estado: string }[];
      kpis: { abiertas: number; enAtencion: number; cerradas: number };
      porGrupo: unknown[];
      etapas: string[];
    }>(await casos.obtenerAlertas.execute({ estado: "TODAS" }));
    expect(todas.alertas.length).toBe(
      todas.kpis.abiertas + todas.kpis.enAtencion + todas.kpis.cerradas,
    );
    const activas = ok<{ alertas: { estado: string }[] }>(
      await casos.obtenerAlertas.execute({ estado: "ACTIVAS" }),
    );
    expect(activas.alertas.every((a) => a.estado !== "CERRADA")).toBe(true);
    const base = todas.alertas[0]!;
    const filtrada = ok<{ alertas: typeof todas.alertas }>(
      await casos.obtenerAlertas.execute({
        estado: "TODAS",
        grupo: base.grupo as never,
        etapa: base.etapa,
        severidad: base.severidad as never,
      }),
    );
    expect(filtrada.alertas.length).toBeGreaterThan(0);
    const abiertas = ok<{ alertas: { estado: string }[] }>(
      await casos.obtenerAlertas.execute({ estado: "ABIERTA" }),
    );
    expect(abiertas.alertas.every((a) => a.estado === "ABIERTA")).toBe(true);
    expect(todas.etapas.length).toBeGreaterThan(0);
  });

  it("muestra el detalle con su transacción y duplicidad", async () => {
    const casos = crearCasos();
    const { alertas } = ok<{ alertas: { id: string; transaccionId?: string }[] }>(
      await casos.obtenerAlertas.execute({ estado: "TODAS" }),
    );
    const conTx = alertas.filter((a) => a.transaccionId);
    expect(conTx.length).toBeGreaterThan(0);
    let vistaDup = false;
    for (const a of conTx) {
      const d = ok<{ transaccion?: Transaccion; duplicidad?: object; puedeActuar: boolean }>(
        await casos.obtenerDetalleAlerta.execute(a.id, "OPERACIONES"),
      );
      expect(d.transaccion).toBeDefined();
      expect(d.puedeActuar).toBe(true);
      if (d.duplicidad) vistaDup = true;
    }
    expect(vistaDup).toBe(true);
    const sinTx = alertas.find((a) => !a.transaccionId)!;
    expect(
      ok<{ transaccion?: unknown; puedeActuar: boolean }>(
        await casos.obtenerDetalleAlerta.execute(sinTx.id, "AUDITORIA"),
      ).puedeActuar,
    ).toBe(false);
    expect(nombreError(await casos.obtenerDetalleAlerta.execute("AL-NO", "OPERACIONES"))).toBe(
      "AlertaNoEncontradaError",
    );
    expect(
      nombreError(
        await crearCasos({ alerta: alertasCaidas }).obtenerDetalleAlerta.execute(
          "x",
          "OPERACIONES",
        ),
      ),
    ).toBe("OrigenDatosNoDisponibleError");
  });

  it("controla el cambio de estado por rol y transición", async () => {
    const casos = crearCasos();
    const { alertas } = ok<{ alertas: { id: string; estado: string }[] }>(
      await casos.obtenerAlertas.execute({ estado: "ABIERTA" }),
    );
    const id = alertas[0]!.id;
    expect(
      nombreError(await casos.cambiarEstadoAlerta.execute(id, "CERRADA", "CONCILIACION")),
    ).toBe("PermisoDenegadoError");
    expect(
      nombreError(await casos.cambiarEstadoAlerta.execute("AL-NO", "CERRADA", "OPERACIONES")),
    ).toBe("AlertaNoEncontradaError");
    expect(nombreError(await casos.cambiarEstadoAlerta.execute(id, "ABIERTA", "OPERACIONES"))).toBe(
      "TransicionAlertaInvalidaError",
    );
    expect(
      ok<{ estado: string }>(
        await casos.cambiarEstadoAlerta.execute(id, "EN_ATENCION", "OPERACIONES"),
      ).estado,
    ).toBe("EN_ATENCION");
    const bitacora = ok<{ evento: string }[]>(await casos.obtenerBitacora.execute());
    expect(bitacora.some((e) => e.evento === "Cambio de estado de alerta")).toBe(true);
  });

  it("exporta alertas con control de permiso", async () => {
    const casos = crearCasos();
    expect(
      ok<{ nombre: string }>(
        await casos.exportarAlertas.execute({ estado: "TODAS" }, "OPERACIONES"),
      ).nombre,
    ).toMatch(/^alertas-.*\.xls$/);
    expect(nombreError(await casos.exportarAlertas.execute({ estado: "TODAS" }, "EJECUTIVO"))).toBe(
      "PermisoDenegadoError",
    );
    expect(
      nombreError(
        await casos.exportarAlertas.execute({ estado: "TODAS", etapa: "no-existe" }, "OPERACIONES"),
      ),
    ).toBe("SinDatosParaExportarError");
    expect(
      nombreError(
        await crearCasos({ alerta: alertasCaidas }).exportarAlertas.execute(
          { estado: "TODAS" },
          "OPERACIONES",
        ),
      ),
    ).toBe("OrigenDatosNoDisponibleError");
    expect(
      nombreError(
        await crearCasos({ alerta: alertasCaidas }).obtenerAlertas.execute({ estado: "TODAS" }),
      ),
    ).toBe("OrigenDatosNoDisponibleError");
  });
});

describe("reporte No Match", () => {
  it("lista las dos categorías con su resumen", async () => {
    const casos = crearCasos();
    for (const categoria of [
      "AUTORIZADAS_NO_COMPENSADAS",
      "COMPENSADAS_SIN_AUTORIZACION",
    ] as const) {
      const r = ok<{
        filas: { fuente: string; archivo: string }[];
        resumen: { transacciones: number; masAntigua: string | null };
        conteos: Record<string, number>;
      }>(await casos.obtenerReporteNoMatch.execute(categoria));
      expect(r.resumen.transacciones).toBe(r.conteos[categoria]);
      expect(r.filas.every((f) => f.fuente && f.archivo)).toBe(true);
      expect(
        ok<{ nombre: string }>(await casos.exportarNoMatch.execute(categoria, "CONCILIACION"))
          .nombre,
      ).toMatch(/^no-match-/);
    }
    expect(
      nombreError(await casos.exportarNoMatch.execute("AUTORIZADAS_NO_COMPENSADAS", "EJECUTIVO")),
    ).toBe("PermisoDenegadoError");
  });

  it("propaga errores y exportaciones vacías", async () => {
    const caido = crearCasos({ transaccion: transaccionesCaidas });
    expect(
      nombreError(await caido.obtenerReporteNoMatch.execute("AUTORIZADAS_NO_COMPENSADAS")),
    ).toBe("OrigenDatosNoDisponibleError");
    expect(
      nombreError(await caido.exportarNoMatch.execute("AUTORIZADAS_NO_COMPENSADAS", "OPERACIONES")),
    ).toBe("OrigenDatosNoDisponibleError");
    const vacio = crearCasos({
      transaccion: {
        listar: async () => ({ success: true as const, data: [] }),
        obtenerPorId: transaccionesCaidas.obtenerPorId,
      },
    });
    const r = ok<{ resumen: { masAntigua: string | null } }>(
      await vacio.obtenerReporteNoMatch.execute("AUTORIZADAS_NO_COMPENSADAS"),
    );
    expect(r.resumen.masAntigua).toBeNull();
    expect(
      nombreError(await vacio.exportarNoMatch.execute("AUTORIZADAS_NO_COMPENSADAS", "OPERACIONES")),
    ).toBe("SinDatosParaExportarError");
  });
});

describe("sesión y bitácora", () => {
  it("inicia, cambia de rol y cierra sesión", async () => {
    const casos = crearCasos();
    const vacia = ok<{ rol: unknown; ultimoRol: string }>(await casos.obtenerSesion.execute());
    expect(vacia).toMatchObject({ rol: null, ultimoRol: "OPERACIONES" });
    expect(nombreError(await casos.iniciarSesion.execute("NADIE"))).toBe("RolInvalidoError");
    expect(ok<{ id: string }>(await casos.iniciarSesion.execute("EJECUTIVO")).id).toBe("EJECUTIVO");
    expect(ok<{ id: string }>(await casos.iniciarSesion.execute("AUDITORIA")).id).toBe("AUDITORIA");
    expect(ok<{ rol: { id: string } }>(await casos.obtenerSesion.execute()).rol.id).toBe(
      "AUDITORIA",
    );
    expect(ok(await casos.cerrarSesion.execute())).toBe(true);
    expect(
      ok<{ rol: unknown; ultimoRol: string }>(await casos.obtenerSesion.execute()),
    ).toMatchObject({ rol: null, ultimoRol: "AUDITORIA" });
    expect(ok(await casos.cerrarSesion.execute())).toBe(true);
    const bitacora = ok<{ evento: string }[]>(await casos.obtenerBitacora.execute());
    expect(bitacora.map((e) => e.evento)).toEqual(
      expect.arrayContaining(["Inicio de sesión", "Cambio de rol", "Cierre de sesión"]),
    );
  });

  it("registra eventos y entrega catálogos", async () => {
    const casos = crearCasos();
    expect(
      ok<{ id: string }>(await casos.registrarEvento.execute("OPERACIONES", "Navegación", "POS"))
        .id,
    ).toBe("EV-00001");
    expect(
      ok<{ adquirentes: unknown[]; emisores: unknown[] }>(await casos.obtenerCatalogos.execute())
        .adquirentes.length,
    ).toBeGreaterThan(0);
  });
});

describe("administración y configuración", () => {
  it("entrega layouts, modelo semántico y postura de seguridad", async () => {
    const casos = crearCasos();
    const todos = ok<{
      resumen: { total: number; activos: number; inactivos: number };
      layouts: unknown[];
    }>(await casos.obtenerLayouts.execute({}));
    expect(todos.resumen.activos + todos.resumen.inactivos).toBe(todos.resumen.total);
    const activos = ok<{ layouts: unknown[] }>(
      await casos.obtenerLayouts.execute({ activo: true, texto: "" }),
    );
    expect(activos.layouts.length).toBe(todos.resumen.activos);
    expect(
      ok<{ metricas: unknown[] }>(await casos.obtenerModeloSemantico.execute()).metricas.length,
    ).toBeGreaterThan(0);
    const postura = ok<{ activos: number; controles: unknown[] }>(
      await casos.obtenerPosturaSeguridad.execute(),
    );
    expect(postura.activos).toBe(postura.controles.length);
  });

  it("propaga fallas del repositorio de administración", async () => {
    const caido = {
      listarLayouts: async () => errorOrigen(),
      obtenerModeloSemantico: async () => errorOrigen(),
      obtenerPosturaSeguridad: async () => errorOrigen(),
    };
    const casos = crearCasos({ administracion: caido });
    expect(nombreError(await casos.obtenerLayouts.execute({}))).toBe(
      "OrigenDatosNoDisponibleError",
    );
    expect(nombreError(await casos.obtenerPosturaSeguridad.execute())).toBe(
      "OrigenDatosNoDisponibleError",
    );
    expect(nombreError(await casos.obtenerModeloSemantico.execute())).toBe(
      "OrigenDatosNoDisponibleError",
    );
  });

  it("lista parámetros por rol y valida su edición", async () => {
    const casos = crearCasos();
    expect(nombreError(await casos.obtenerParametros.execute("NADIE" as never))).toBe(
      "RolInvalidoError",
    );
    const grupos = ok<
      {
        grupo: string;
        editable: boolean;
        parametros: {
          clave: string;
          valor: number;
          minimo: number;
          maximo: number;
          grupo: string;
        }[];
      }[]
    >(await casos.obtenerParametros.execute("OPERACIONES"));
    expect(grupos.find((g) => g.grupo === "UMBRALES_ALERTA")?.editable).toBe(true);
    expect(grupos.find((g) => g.grupo === "PLAZOS")?.editable).toBe(false);
    const umbral = grupos.find((g) => g.grupo === "UMBRALES_ALERTA")!.parametros[0]!;
    const plazo = grupos.find((g) => g.grupo === "PLAZOS")!.parametros[0]!;

    expect(
      nombreError(await casos.actualizarParametro.execute("no-existe", 1, "ADMINISTRADOR")),
    ).toBe("ParametroNoEncontradoError");
    expect(
      nombreError(await casos.actualizarParametro.execute(plazo.clave, plazo.valor, "OPERACIONES")),
    ).toBe("PermisoDenegadoError");
    expect(
      nombreError(
        await casos.actualizarParametro.execute(umbral.clave, umbral.maximo + 1, "OPERACIONES"),
      ),
    ).toBe("ValorParametroInvalidoError");
    expect(
      ok<{ valor: number }>(
        await casos.actualizarParametro.execute(umbral.clave, umbral.minimo, "OPERACIONES"),
      ).valor,
    ).toBe(umbral.minimo);
    const despues = ok<typeof grupos>(await casos.obtenerParametros.execute("OPERACIONES"));
    expect(despues.flatMap((g) => g.parametros).find((p) => p.clave === umbral.clave)?.valor).toBe(
      umbral.minimo,
    );
    const bitacora = ok<{ evento: string }[]>(await casos.obtenerBitacora.execute());
    expect(bitacora.some((e) => e.evento === "Cambio de parámetro")).toBe(true);
  });

  it("propaga fallas del repositorio de parámetros", async () => {
    const casos = crearCasos({
      parametro: { listar: async () => errorOrigen(), actualizar: async () => errorOrigen() },
    });
    expect(nombreError(await casos.obtenerParametros.execute("OPERACIONES"))).toBe(
      "OrigenDatosNoDisponibleError",
    );
    expect(nombreError(await casos.actualizarParametro.execute("k", 1, "OPERACIONES"))).toBe(
      "OrigenDatosNoDisponibleError",
    );
  });
});

describe("dashboards: errores y ramas", () => {
  const invalido = {
    rango: { desde: "2026-09-25T00:00:00.000Z", hasta: "2026-08-01T00:00:00.000Z" },
  };

  it("rechazan rangos inválidos", async () => {
    const casos = crearCasos();
    expect(nombreError(await casos.obtenerDashboardPOS.execute(invalido))).toBe(
      "RangoFechasInvalidoError",
    );
    expect(nombreError(await casos.obtenerDashboardATM.execute(invalido))).toBe(
      "RangoFechasInvalidoError",
    );
    expect(nombreError(await casos.obtenerResumenEjecutivo.execute(invalido))).toBe(
      "RangoFechasInvalidoError",
    );
  });

  it("propagan fallas de cada repositorio", async () => {
    const sinTx = crearCasos({ transaccion: transaccionesCaidas });
    expect(nombreError(await sinTx.obtenerDashboardPOS.execute(filtros30))).toBe(
      "OrigenDatosNoDisponibleError",
    );
    expect(nombreError(await sinTx.obtenerDashboardATM.execute(filtros30))).toBe(
      "OrigenDatosNoDisponibleError",
    );
    expect(nombreError(await sinTx.obtenerResumenEjecutivo.execute(filtros30))).toBe(
      "OrigenDatosNoDisponibleError",
    );
    const sinArchivos = crearCasos({ archivo: archivosCaidos });
    expect(nombreError(await sinArchivos.obtenerDashboardATM.execute(filtros30))).toBe(
      "OrigenDatosNoDisponibleError",
    );
    expect(nombreError(await sinArchivos.obtenerResumenEjecutivo.execute(filtros30))).toBe(
      "OrigenDatosNoDisponibleError",
    );
    expect(
      nombreError(
        await crearCasos({ alerta: alertasCaidas }).obtenerResumenEjecutivo.execute(filtros30),
      ),
    ).toBe("OrigenDatosNoDisponibleError");
    expect(nombreError(await crearCasos({ sla: slaCaido }).obtenerDashboardSLA.execute())).toBe(
      "OrigenDatosNoDisponibleError",
    );
  });

  it("calculan con periodos sin datos", async () => {
    const vacio = crearCasos({
      transaccion: {
        listar: async () => ({ success: true as const, data: [] }),
        obtenerPorId: transaccionesCaidas.obtenerPorId,
      },
      archivo: { listarRecepciones: async () => ({ success: true as const, data: [] }) },
    });
    const ejecutivo = ok<{
      kpis: { tasaMatch: number; autorizadas: number };
      promedioDiario: number;
    }>(await vacio.obtenerResumenEjecutivo.execute(filtros30));
    expect(ejecutivo.kpis).toMatchObject({ tasaMatch: 100, autorizadas: 0 });
    const pos = ok<{ kpis: { ticketPromedio: number } }>(
      await vacio.obtenerDashboardPOS.execute(filtros30),
    );
    expect(pos.kpis.ticketPromedio).toBe(0);
    const atm = ok<{ setlFaltante: string | null; comparacion: { tasa: number } }>(
      await vacio.obtenerDashboardATM.execute(filtros30),
    );
    expect(atm.setlFaltante).toBeNull();
    expect(atm.comparacion.tasa).toBe(100);
    const sinDias = ok<{ promedioDiario: number }>(
      await vacio.obtenerResumenEjecutivo.execute({
        rango: { desde: "2026-09-25T00:00:00.000Z", hasta: "2026-09-25T00:00:00.000Z" },
      }),
    );
    expect(sinDias.promedioDiario).toBe(0);
  });

  it("el dashboard de SLA acepta un día seleccionado o cae en hoy", async () => {
    const casos = crearCasos();
    const hoy = ok<{
      fechaHoy: string;
      fechaSeleccionada: string;
      cumplimientoDiario: { fecha: string }[];
    }>(await casos.obtenerDashboardSLA.execute());
    expect(hoy.fechaSeleccionada).toBe(hoy.fechaHoy);
    const otro = hoy.cumplimientoDiario[0]!.fecha;
    expect(
      ok<{ fechaSeleccionada: string }>(await casos.obtenerDashboardSLA.execute(otro))
        .fechaSeleccionada,
    ).toBe(otro);
    expect(
      ok<{ fechaSeleccionada: string }>(await casos.obtenerDashboardSLA.execute("1999-01-01"))
        .fechaSeleccionada,
    ).toBe(hoy.fechaHoy);
  });

  it("el repositorio mock devuelve datos reutilizables", () => {
    const repos = crearRepositoriosMock();
    expect(Object.keys(repos)).toContain("transaccion");
  });
});
