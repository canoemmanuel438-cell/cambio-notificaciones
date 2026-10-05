import { describe, expect, it } from "vitest";

import { AHORA, txBase } from "@/application/__tests__/ayudas";
import { coincideLayout, type Layout } from "@/domain/entities/Administracion";
import { accionesDisponibles, esTransicionValida, severidadMaxima } from "@/domain/entities/Alerta";
import {
  cumpleCriterios,
  cumpleFiltrosGlobales,
  dentroDeRango,
  diasEnRango,
  esRangoValido,
  tieneCriterios,
} from "@/domain/entities/Filtros";
import { definirIndicador, claveSla, IDS_PROCESO_SLA } from "@/domain/entities/Indicador";
import { puedeEditarGrupo, valorValido, type Parametro } from "@/domain/entities/Parametros";
import { buscarRol, puedeVerPantalla } from "@/domain/entities/Rol";
import {
  claseTrazabilidad,
  enmascararPAN,
  estaVencida,
  estatusTransaccion,
  estadoEtapa,
  tieneInconsistencia,
  tienePendientes,
} from "@/domain/entities/Transaccion";
import * as errores from "@/domain/errors/DomainErrors";
import { fail, isFail, isOk, ok } from "@/domain/shared/Result";

describe("Result", () => {
  it("distingue éxito de fallo", () => {
    expect(isOk(ok(1))).toBe(true);
    expect(isFail(ok(1))).toBe(false);
    const f = fail(new Error("x"));
    expect(isFail(f)).toBe(true);
    expect(isOk(f)).toBe(false);
  });
});

describe("errores de dominio", () => {
  it("cada error tiene nombre y mensaje descriptivo", () => {
    const casos = [
      new errores.RangoFechasInvalidoError(),
      new errores.CriteriosBusquedaVaciosError(),
      new errores.TransaccionNoEncontradaError("TX-9"),
      new errores.IndicadorNoEncontradoError("zzz"),
      new errores.AlertaNoEncontradaError("AL-9"),
      new errores.TransicionAlertaInvalidaError("Cerrada", "En atención"),
      new errores.PermisoDenegadoError("hacer algo"),
      new errores.RolInvalidoError("X"),
      new errores.SinDatosParaExportarError(),
      new errores.OrigenDatosNoDisponibleError(),
      new errores.ParametroNoEncontradoError("k"),
      new errores.ValorParametroInvalidoError(1, 5),
    ];
    for (const e of casos) {
      expect(e).toBeInstanceOf(errores.DomainError);
      expect(e.name).toMatch(/Error$/);
      expect(e.message.length).toBeGreaterThan(5);
    }
    expect(casos[2]).toMatchObject({ id: "TX-9" });
    expect(casos[5]).toMatchObject({ desde: "Cerrada", hacia: "En atención" });
  });
});

describe("filtros", () => {
  const rango = { desde: "2026-09-01T00:00:00.000Z", hasta: "2026-09-03T23:59:59.999Z" };

  it("valida rangos", () => {
    expect(esRangoValido(rango)).toBe(true);
    expect(esRangoValido({ desde: rango.hasta, hasta: rango.desde })).toBe(false);
    expect(esRangoValido({ desde: "no", hasta: rango.hasta })).toBe(false);
  });

  it("detecta fechas dentro del rango y enumera sus días", () => {
    expect(dentroDeRango("2026-09-02T10:00:00.000Z", rango)).toBe(true);
    expect(dentroDeRango("2026-09-10T10:00:00.000Z", rango)).toBe(false);
    expect(diasEnRango(rango)).toEqual(["2026-09-01", "2026-09-02", "2026-09-03"]);
    expect(diasEnRango({ desde: "basura", hasta: "2026-09-03" })).toEqual([]);
  });

  it("aplica filtros globales por adquirente, emisor, origen y circuito (solo POS)", () => {
    const pos = txBase({ fecha: "2026-09-02T10:00:00.000Z", origen: "ONLINE", circuito: "LOCAL" });
    expect(cumpleFiltrosGlobales(pos, { rango })).toBe(true);
    expect(cumpleFiltrosGlobales(pos, { rango, adquirente: "Otro" })).toBe(false);
    expect(cumpleFiltrosGlobales(pos, { rango, emisor: "Otro" })).toBe(false);
    expect(cumpleFiltrosGlobales(pos, { rango, origen: "ARCHIVO" })).toBe(false);
    expect(cumpleFiltrosGlobales(pos, { rango, circuito: "SALIENTE" })).toBe(false);
    expect(
      cumpleFiltrosGlobales(pos, {
        rango: { desde: "2026-10-01T00:00:00.000Z", hasta: "2026-10-02T00:00:00.000Z" },
      }),
    ).toBe(false);
    const atm = txBase({ canal: "ATM", fecha: "2026-09-02T10:00:00.000Z" });
    expect(cumpleFiltrosGlobales(atm, { rango, origen: "ARCHIVO", circuito: "SALIENTE" })).toBe(
      true,
    );
  });

  it("evalúa los criterios de búsqueda", () => {
    const t = txBase();
    expect(tieneCriterios({})).toBe(false);
    expect(tieneCriterios({ id: "" })).toBe(false);
    expect(tieneCriterios({ id: "TX" })).toBe(true);
    expect(cumpleCriterios(t, { id: " tx-prueba-1 " })).toBe(true);
    expect(cumpleCriterios(t, { id: "otro" })).toBe(false);
    expect(cumpleCriterios(t, { adquirente: "BBVA México" })).toBe(true);
    expect(cumpleCriterios(t, { adquirente: "x" })).toBe(false);
    expect(cumpleCriterios(t, { emisor: "Banorte" })).toBe(true);
    expect(cumpleCriterios(t, { emisor: "x" })).toBe(false);
    expect(cumpleCriterios(t, { pan: "5579 1012" })).toBe(true);
    expect(cumpleCriterios(t, { pan: "9999" })).toBe(false);
    expect(cumpleCriterios(t, { pan: "abc" })).toBe(false);
    expect(cumpleCriterios(t, { referencia: "7000000000000000000001" })).toBe(true);
    expect(cumpleCriterios(t, { referencia: "123" })).toBe(false);
    expect(cumpleCriterios(t, { fecha: "2026-09-20" })).toBe(true);
    expect(cumpleCriterios(t, { fecha: "2026-09-21" })).toBe(false);
    expect(cumpleCriterios(t, { monto: 100 })).toBe(true);
    expect(cumpleCriterios(t, { monto: 101 })).toBe(false);
    expect(cumpleCriterios(t, { afiliacion: " 6000001 " })).toBe(true);
    expect(cumpleCriterios(t, { afiliacion: "1" })).toBe(false);
    expect(cumpleCriterios(t, { autorizacion: "abc123" })).toBe(true);
    expect(cumpleCriterios(t, { autorizacion: "zzz" })).toBe(false);
  });
});

describe("transacción", () => {
  it("enmascara PAN cortos sin alterarlos", () => expect(enmascararPAN("123")).toBe("123"));

  it("calcula estatus y clase de trazabilidad", () => {
    const completa = txBase();
    expect(estatusTransaccion(completa, AHORA)).toBe("MATCH");
    expect(claseTrazabilidad(completa)).toBe("CICLO_COMPLETO");

    const rechazada = txBase({ aprobada: false });
    expect(estatusTransaccion(rechazada, AHORA)).toBe("RECHAZADA");
    expect(claseTrazabilidad(rechazada)).toBe("RECHAZADA");

    const pendiente = txBase({
      etapas: [{ etapa: "COMPENSACION", estado: "PENDIENTE", fuente: "x" }],
    });
    expect(tienePendientes(pendiente)).toBe(true);
    expect(estatusTransaccion(pendiente, AHORA)).toBe("EN_PROCESO");
    expect(claseTrazabilidad(pendiente)).toBe("PENDIENTE");

    const inconsistente = txBase({
      inconsistencia: "DISCREPANCIA_IMPORTE",
      etapas: [{ etapa: "COMPENSACION", estado: "INCONSISTENCIA", fuente: "x" }],
    });
    expect(tieneInconsistencia(inconsistente)).toBe(true);
    expect(estatusTransaccion(inconsistente, AHORA)).toBe("NO_MATCH");
    expect(claseTrazabilidad(inconsistente)).toBe("CON_INCONSISTENCIA");

    const vencida = txBase({
      fecha: "2026-06-01T10:00:00.000Z",
      etapas: [{ etapa: "COMPENSACION", estado: "PENDIENTE", fuente: "x" }],
    });
    expect(estaVencida(vencida, AHORA)).toBe(true);
    expect(estatusTransaccion(vencida, AHORA)).toBe("VENCIDA");

    const duplicada = txBase({
      duplicidad: {
        llavePET: "K",
        rol: "DUPLICADO",
        contraparteId: "TX-0",
        registro: { archivo: "a", linea: 1, horaRecepcion: "2026-09-20T10:00:00.000Z" },
      },
    });
    expect(claseTrazabilidad(duplicada)).toBe("DUPLICADA");
    expect(estaVencida(duplicada, AHORA)).toBe(false);
  });

  it("estadoEtapa devuelve NO_APLICA si la etapa no existe", () => {
    expect(estadoEtapa(txBase(), "ENVIO")).toBe("NO_APLICA");
  });
});

describe("alertas, parámetros y roles", () => {
  it("define acciones y transiciones de alertas", () => {
    expect(accionesDisponibles("CERRADA")).toHaveLength(1);
    expect(esTransicionValida("ABIERTA", "CERRADA")).toBe(true);
    expect(esTransicionValida("ABIERTA", "ABIERTA")).toBe(false);
  });

  it("obtiene la severidad máxima", () => {
    expect(severidadMaxima([])).toBeUndefined();
    expect(severidadMaxima(["BAJA", "ALTA", "MEDIA"])).toBe("ALTA");
    expect(severidadMaxima(["BAJA", "MEDIA"])).toBe("MEDIA");
  });

  it("valida alcance de edición y valores de parámetros", () => {
    expect(puedeEditarGrupo("TODOS", "PLAZOS")).toBe(true);
    expect(puedeEditarGrupo("UMBRALES_ALERTA", "UMBRALES_ALERTA")).toBe(true);
    expect(puedeEditarGrupo("UMBRALES_ALERTA", "PLAZOS")).toBe(false);
    expect(puedeEditarGrupo("NINGUNO", "PLAZOS")).toBe(false);
    const p: Parametro = {
      clave: "k",
      grupo: "PLAZOS",
      nombre: "n",
      unidad: "días",
      valor: 5,
      minimo: 1,
      maximo: 10,
    };
    expect(valorValido(p, 5)).toBe(true);
    expect(valorValido(p, 0)).toBe(false);
    expect(valorValido(p, 11)).toBe(false);
    expect(valorValido(p, Number.NaN)).toBe(false);
  });

  it("busca roles y valida acceso a pantallas", () => {
    expect(buscarRol("NADA")).toBeUndefined();
    const ejecutivo = buscarRol("EJECUTIVO")!;
    expect(puedeVerPantalla(ejecutivo, "SLA")).toBe(true);
    expect(puedeVerPantalla(ejecutivo, "SEGURIDAD")).toBe(false);
  });
});

describe("layouts", () => {
  const layout: Layout = {
    id: "L1",
    nombre: "Layout TLF",
    fuente: "TLF",
    canal: "ATM",
    version: 1,
    campos: 10,
    fiids: ["BB01"],
    activo: true,
    ultimaModificacion: "2026-09-01T00:00:00.000Z",
  };
  it("filtra por canal, estatus y texto", () => {
    expect(coincideLayout(layout, {})).toBe(true);
    expect(coincideLayout(layout, { canal: "POS" })).toBe(false);
    expect(coincideLayout(layout, { activo: false })).toBe(false);
    expect(coincideLayout(layout, { texto: "  " })).toBe(true);
    expect(coincideLayout(layout, { texto: "bb01" })).toBe(true);
    expect(coincideLayout(layout, { texto: "zzz" })).toBe(false);
  });
});

describe("indicadores de SLA", () => {
  it("resuelve cada proceso con su día de datos", () => {
    for (const id of IDS_PROCESO_SLA) {
      const d = definirIndicador(claveSla(id, "2026-09-25"));
      expect(d?.origen).toBe("SLA");
      expect(d?.dia).toBe("2026-09-25");
      expect(d?.ignoraFiltros).toBe(true);
    }
    expect(definirIndicador(claveSla("TLF", "2026-09-25"))?.descripcion).toContain("24/09/2026");
    expect(definirIndicador(claveSla("ENVIO_INT", "2026-09-25"))?.descripcion).toContain(
      "23/09/2026",
    );
  });

  it("rechaza procesos o fechas inválidas", () => {
    expect(definirIndicador("sla:NOEXISTE:2026-09-25")).toBeUndefined();
    expect(definirIndicador("sla:TLF:ayer")).toBeUndefined();
    expect(definirIndicador("sla:TLF")).toBeUndefined();
    expect(definirIndicador("sla")).toBeUndefined();
  });
});
