import { afterEach, describe, expect, it, vi } from "vitest";

import { txBase } from "@/application/__tests__/ayudas";
import type { Alerta } from "@/domain/entities/Alerta";
import { AdministracionMapper } from "@/infrastructure/mappers/AdministracionMapper";
import { OperacionMapper } from "@/infrastructure/mappers/OperacionMapper";
import { ParametroMapper } from "@/infrastructure/mappers/ParametroMapper";
import { TransaccionMapper } from "@/infrastructure/mappers/TransaccionMapper";
import { AlertaMapper } from "@/infrastructure/mappers/AlertaMapper";
import {
  LAYOUTS_RAW,
  MODELO_SEMANTICO_RAW,
  POSTURA_SEGURIDAD_RAW,
} from "@/infrastructure/mock/data/administracion";
import { datasetRaw, type TransaccionRaw } from "@/infrastructure/mock/data/generador";
import {
  MemoriaBitacoraRepository,
  MockAlertaRepository,
  MockArchivoRepository,
  MockCatalogoRepository,
  MockSLARepository,
  MockTransaccionRepository,
  NavegadorParametroRepository,
  NavegadorSesionRepository,
} from "@/infrastructure/repositories/MockRepositories";
import { MockAdministracionRepository } from "@/infrastructure/repositories/MockAdministracionRepository";
import {
  almacenamientoNavegador,
  crearAlmacenamientoMemoria,
} from "@/infrastructure/storage/AlmacenamientoNavegador";

const explota = () => {
  throw new Error("origen caído");
};
const nombre = (r: { success: boolean; error?: Error }) => (r.success ? null : r.error?.name);

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("almacenamiento", () => {
  it("en memoria guarda y devuelve valores, o el valor por defecto", () => {
    const a = crearAlmacenamientoMemoria();
    expect(a.leer("k", 7)).toBe(7);
    a.escribir("k", { x: 1 });
    expect(a.leer("k", null)).toEqual({ x: 1 });
  });

  it("del navegador es inofensivo sin window (SSR)", () => {
    expect(almacenamientoNavegador.leer("k", "defecto")).toBe("defecto");
    expect(() => almacenamientoNavegador.escribir("k", 1)).not.toThrow();
  });

  it("del navegador usa localStorage y tolera fallas", () => {
    const datos = new Map<string, string>();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (k: string) => datos.get(k) ?? null,
        setItem: (k: string, v: string) => void datos.set(k, v),
      },
    });
    almacenamientoNavegador.escribir("k", [1, 2]);
    expect(almacenamientoNavegador.leer("k", [])).toEqual([1, 2]);
    expect(almacenamientoNavegador.leer("otro", "d")).toBe("d");
    datos.set("roto", "{no es json");
    expect(almacenamientoNavegador.leer("roto", "d")).toBe("d");
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => null,
        setItem: () => {
          throw new Error("lleno");
        },
      },
    });
    expect(() => almacenamientoNavegador.escribir("k", 1)).not.toThrow();
  });
});

describe("repositorios de solo lectura", () => {
  it("transacciones: lista, busca y reporta origen caído", async () => {
    const repo = new MockTransaccionRepository();
    const lista = await repo.listar();
    expect(lista.success && lista.data.length).toBeGreaterThan(0);
    const id = lista.success ? lista.data[0]!.id : "";
    expect((await repo.obtenerPorId(id)).success).toBe(true);
    expect(nombre(await repo.obtenerPorId("nada"))).toBe("TransaccionNoEncontradaError");
    const caido = new MockTransaccionRepository(explota);
    expect(nombre(await caido.listar())).toBe("OrigenDatosNoDisponibleError");
    expect(nombre(await caido.obtenerPorId("x"))).toBe("OrigenDatosNoDisponibleError");
  });

  it("archivos, catálogos y SLA reportan origen caído", async () => {
    expect((await new MockArchivoRepository().listarRecepciones()).success).toBe(true);
    expect((await new MockCatalogoRepository().obtener()).success).toBe(true);
    expect((await new MockSLARepository().listarEjecuciones()).success).toBe(true);
    expect(nombre(await new MockArchivoRepository(explota).listarRecepciones())).toBe(
      "OrigenDatosNoDisponibleError",
    );
    expect(nombre(await new MockCatalogoRepository(explota).obtener())).toBe(
      "OrigenDatosNoDisponibleError",
    );
    expect(nombre(await new MockSLARepository(explota).listarEjecuciones())).toBe(
      "OrigenDatosNoDisponibleError",
    );
  });

  it("administración reporta origen caído", async () => {
    const repo = new MockAdministracionRepository();
    expect((await repo.listarLayouts()).success).toBe(true);
    expect((await repo.obtenerModeloSemantico()).success).toBe(true);
    expect((await repo.obtenerPosturaSeguridad()).success).toBe(true);
    vi.spyOn(AdministracionMapper, "layout").mockImplementation(explota);
    vi.spyOn(AdministracionMapper, "modelo").mockImplementation(explota);
    vi.spyOn(AdministracionMapper, "postura").mockImplementation(explota);
    expect(nombre(await repo.listarLayouts())).toBe("OrigenDatosNoDisponibleError");
    expect(nombre(await repo.obtenerModeloSemantico())).toBe("OrigenDatosNoDisponibleError");
    expect(nombre(await repo.obtenerPosturaSeguridad())).toBe("OrigenDatosNoDisponibleError");
  });
});

describe("repositorios con estado", () => {
  it("alertas: persiste el estado y reporta errores", async () => {
    const almacen = crearAlmacenamientoMemoria();
    const repo = new MockAlertaRepository(almacen);
    const lista = await repo.listar();
    const alerta = lista.success ? lista.data[0]! : (undefined as never);
    const nuevo = alerta.estado === "CERRADA" ? "ABIERTA" : "CERRADA";
    expect((await repo.actualizarEstado(alerta.id, nuevo)).success).toBe(true);
    const recargada = await new MockAlertaRepository(almacen).obtenerPorId(alerta.id);
    expect(recargada.success && recargada.data.estado).toBe(nuevo);
    expect(nombre(await repo.obtenerPorId("AL-NO"))).toBe("AlertaNoEncontradaError");
    expect(nombre(await repo.actualizarEstado("AL-NO", "CERRADA"))).toBe("AlertaNoEncontradaError");
    const caido = new MockAlertaRepository(almacen, explota as () => Alerta[]);
    expect(nombre(await caido.listar())).toBe("OrigenDatosNoDisponibleError");
  });

  it("sesión: valores vacíos por defecto y guardado", async () => {
    const repo = new NavegadorSesionRepository(crearAlmacenamientoMemoria());
    expect(await repo.obtener()).toEqual({
      success: true,
      data: { rolActivo: null, ultimoRol: null },
    });
    await repo.guardar({ rolActivo: "EJECUTIVO", ultimoRol: "EJECUTIVO" });
    expect(await repo.obtener()).toMatchObject({ data: { rolActivo: "EJECUTIVO" } });
  });

  it("parámetros: aplica cambios guardados y rechaza claves desconocidas", async () => {
    const repo = new NavegadorParametroRepository(crearAlmacenamientoMemoria());
    const lista = await repo.listar();
    const p = lista.success ? lista.data[0]! : (undefined as never);
    const r = await repo.actualizar(p.clave, p.minimo);
    expect(r.success && r.data.valor).toBe(p.minimo);
    const despues = await repo.listar();
    expect(despues.success && despues.data.find((x) => x.clave === p.clave)?.valor).toBe(p.minimo);
    expect(nombre(await repo.actualizar("nada", 1))).toBe("ParametroNoEncontradoError");
  });

  it("bitácora en memoria numera los eventos", async () => {
    const repo = new MemoriaBitacoraRepository();
    const e = await repo.registrar({
      fecha: "2026-09-25T00:00:00.000Z",
      rol: "OPERACIONES",
      evento: "Navegación",
      detalle: "x",
    });
    expect(e.success && e.data.id).toBe("EV-00001");
    const lista = await repo.listar();
    expect(lista.success && lista.data).toHaveLength(1);
  });
});

describe("mappers", () => {
  const raw = datasetRaw().transacciones[0]!;
  const con = (cambios: Record<string, unknown>) =>
    ({ ...raw, ...cambios }) as unknown as TransaccionRaw;

  it("transacción: tarjeta de crédito, rechazo y estados de posteo/depósito/aclaración", () => {
    const credito = TransaccionMapper.desdeRaw(
      con({
        card_type: "C",
        reject_code: "51",
        reject_desc: undefined,
        posting: "PEND",
        deposit: "OK",
        claim: "OPEN",
      }),
    );
    expect(credito.tipoTarjeta).toBe("CREDITO");
    expect(credito.motivoRechazo).toEqual({ codigo: "51", descripcion: "" });
    expect(credito).toMatchObject({
      posteo: "PENDIENTE",
      deposito: "COMPLETADO",
      aclaracion: "ABIERTA",
    });
    const otro = TransaccionMapper.desdeRaw(
      con({
        card_type: "D",
        reject_code: undefined,
        posting: "OK",
        deposit: "PEND",
        claim: "RESOLVED",
      }),
    );
    expect(otro.tipoTarjeta).toBe("DEBITO");
    expect(otro.motivoRechazo).toBeUndefined();
    expect(otro).toMatchObject({
      posteo: "COMPLETADO",
      deposito: "PENDIENTE",
      aclaracion: "RESUELTA",
    });
  });

  it("transacción: ignora valores fuera de catálogo", () => {
    const t = TransaccionMapper.desdeRaw(
      con({
        circuit: "XX",
        origin: "YY",
        atm_op: "ZZ",
        issue: "WW",
        posting: undefined,
        deposit: undefined,
        claim: undefined,
      }),
    );
    expect(t).toMatchObject({
      circuito: undefined,
      origen: undefined,
      operacionATM: undefined,
      inconsistencia: undefined,
      posteo: undefined,
    });
  });

  it("alertas se mapean con su transacción opcional", () => {
    const alertas = AlertaMapper.listaDesdeRaw(datasetRaw().alertas);
    expect(alertas.some((a) => a.transaccionId)).toBe(true);
    expect(alertas.some((a) => !a.transaccionId)).toBe(true);
  });

  it("parámetros", () => {
    const lista = datasetRaw().parametros.map(ParametroMapper.desdeRaw);
    expect(new Set(lista.map((p) => p.grupo)).size).toBe(4);
  });

  it("operación: ignora ejecuciones de procesos desconocidos y recepciones", () => {
    const d = datasetRaw();
    const todas = OperacionMapper.ejecucionesDesdeRaw(d.procesos, d.ejecuciones);
    const conHuerfana = OperacionMapper.ejecucionesDesdeRaw(d.procesos, [
      ...d.ejecuciones,
      { ...d.ejecuciones[0]!, process_id: "FANTASMA" },
    ]);
    expect(conHuerfana).toHaveLength(todas.length);
    expect(OperacionMapper.recepcionDesdeRaw(d.recepciones[0]!)).toHaveProperty("fuente");
  });

  it("administración: canal inválido, conexión caída y autenticación incompleta", () => {
    expect(AdministracionMapper.layout({ ...LAYOUTS_RAW[0]!, canal: "OTRO" as never }).canal).toBe(
      "POS",
    );
    expect(
      AdministracionMapper.layout({ ...LAYOUTS_RAW[0]!, estatus: "I" as never, fiids: "" }).activo,
    ).toBe(false);
    expect(
      AdministracionMapper.modelo({
        ...MODELO_SEMANTICO_RAW,
        conexion: { ...MODELO_SEMANTICO_RAW.conexion, conectada: false },
      }).conexion.estado,
    ).toBe("DESCONECTADA");
    expect(
      AdministracionMapper.postura({ ...POSTURA_SEGURIDAD_RAW, autenticacion: [] as never })
        .autenticacion,
    ).toEqual({ proveedor: "", protocolo: "" });
  });

  it("una transacción de prueba conserva sus campos", () => {
    expect(txBase().id).toBe("TX-PRUEBA-1");
  });
});
