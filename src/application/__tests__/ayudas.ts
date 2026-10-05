import type { Transaccion } from "@/domain/entities/Transaccion";
import { OrigenDatosNoDisponibleError } from "@/domain/errors/DomainErrors";
import { fail } from "@/domain/shared/Result";
import {
  crearDependencias,
  crearRepositoriosMock,
  type Repositorios,
} from "@/infrastructure/di/container";
import { AHORA_SIMULADO } from "@/infrastructure/mock/data/generador";
import {
  MockAlertaRepository,
  NavegadorParametroRepository,
  NavegadorSesionRepository,
} from "@/infrastructure/repositories/MockRepositories";
import { crearAlmacenamientoMemoria } from "@/infrastructure/storage/AlmacenamientoNavegador";

export const AHORA = new Date(AHORA_SIMULADO);
export const relojesFijos = {
  datos: () => new Date(AHORA_SIMULADO),
  eventos: () => new Date(AHORA_SIMULADO),
};

/** Dependencias con repos mock y almacenamiento en memoria (cada llamada parte de cero). */
export const crearCasos = (reemplazos: Partial<Repositorios> = {}) => {
  const almacen = crearAlmacenamientoMemoria();
  const repos: Repositorios = {
    ...crearRepositoriosMock(),
    alerta: new MockAlertaRepository(almacen),
    sesion: new NavegadorSesionRepository(almacen),
    parametro: new NavegadorParametroRepository(almacen),
    ...reemplazos,
  };
  return crearDependencias(repos, relojesFijos).casosDeUso;
};

export const filtros30 = {
  rango: { desde: "2026-08-27T00:00:00.000Z", hasta: new Date(AHORA_SIMULADO).toISOString() },
};

export const errorOrigen = () => fail(new OrigenDatosNoDisponibleError());

/** Repositorios cuyo origen siempre falla, para probar la propagación de errores. */
export const transaccionesCaidas = {
  listar: async () => errorOrigen(),
  obtenerPorId: async () => errorOrigen(),
};
export const alertasCaidas = {
  listar: async () => errorOrigen(),
  obtenerPorId: async () => errorOrigen(),
  actualizarEstado: async () => errorOrigen(),
};
export const archivosCaidos = { listarRecepciones: async () => errorOrigen() };
export const slaCaido = { listarEjecuciones: async () => errorOrigen() };

export const txBase = (cambios: Partial<Transaccion> = {}): Transaccion => ({
  id: "TX-PRUEBA-1",
  canal: "POS",
  fecha: "2026-09-20T10:00:00.000Z",
  adquirente: "BBVA México",
  adquirenteId: "120127",
  emisor: "Banorte",
  emisorId: "210047",
  afiliacion: "6000001",
  pan: "5579101234561234",
  referencia: "7000000000000000000001",
  autorizacion: "ABC123",
  tipoTarjeta: "DEBITO",
  monto: 100,
  tipoMensaje: "210",
  codigoDC: "DC01",
  archivoOrigen: "archivo.txt",
  aprobada: true,
  etapas: [
    { etapa: "AUTORIZACION", estado: "COMPLETADO", fuente: "Online" },
    { etapa: "COMPENSACION", estado: "COMPLETADO", fuente: "COMP_POS", archivo: "comp.txt" },
  ],
  ...cambios,
});
