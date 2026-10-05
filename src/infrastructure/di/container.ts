import { ObtenerLayoutsUseCase } from "@/application/useCases/administracion/ObtenerLayoutsUseCase";
import { ObtenerModeloSemanticoUseCase } from "@/application/useCases/administracion/ObtenerModeloSemanticoUseCase";
import { ObtenerPosturaSeguridadUseCase } from "@/application/useCases/administracion/ObtenerPosturaSeguridadUseCase";
import type { IAdministracionRepository } from "@/domain/repositories/IAdministracionRepository";
import { MockAdministracionRepository } from "@/infrastructure/repositories/MockAdministracionRepository";
import { FormatoExportacionService } from "@/application/services/FormatoExportacionService";
import {
  CambiarEstadoAlertaUseCase,
  ExportarAlertasUseCase,
  ObtenerAlertasUseCase,
  ObtenerDetalleAlertaUseCase,
} from "@/application/useCases/alertas";
import {
  ExportarDetalleIndicadorUseCase,
  ObtenerDetalleIndicadorUseCase,
} from "@/application/useCases/detalle";
import { ObtenerDashboardATMUseCase } from "@/application/useCases/dashboard/ObtenerDashboardATMUseCase";
import { ObtenerDashboardPOSUseCase } from "@/application/useCases/dashboard/ObtenerDashboardPOSUseCase";
import { ObtenerDashboardSLAUseCase } from "@/application/useCases/dashboard/ObtenerDashboardSLAUseCase";
import { ObtenerResumenEjecutivoUseCase } from "@/application/useCases/dashboard/ObtenerResumenEjecutivoUseCase";
import { ActualizarParametroUseCase } from "@/application/useCases/configuracion/ActualizarParametroUseCase";
import { ObtenerParametrosUseCase } from "@/application/useCases/configuracion/ObtenerParametrosUseCase";
import {
  ExportarNoMatchUseCase,
  ObtenerReporteNoMatchUseCase,
} from "@/application/useCases/noMatch";
import {
  CerrarSesionUseCase,
  IniciarSesionUseCase,
  ObtenerBitacoraUseCase,
  ObtenerCatalogosUseCase,
  ObtenerSesionUseCase,
  RegistrarEventoUseCase,
} from "@/application/useCases/sesion";
import {
  BuscarTransaccionesUseCase,
  ExportarFichaUseCase,
  ExportarTrazabilidadUseCase,
  ObtenerEjemplosBusquedaUseCase,
  ObtenerFichaTransaccionUseCase,
} from "@/application/useCases/trazabilidad";
import type {
  IAlertaRepository,
  IArchivoRepository,
  IBitacoraRepository,
  ICatalogoRepository,
  ISLARepository,
  IParametroRepository,
  ISesionRepository,
  ITransaccionRepository,
} from "@/domain/repositories";
import type { Reloj } from "@/domain/shared/Reloj";
import { AHORA_SIMULADO } from "@/infrastructure/mock/data/generador";
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
import { almacenamientoNavegador } from "@/infrastructure/storage/AlmacenamientoNavegador";

export interface Repositorios {
  transaccion: ITransaccionRepository;
  alerta: IAlertaRepository;
  sla: ISLARepository;
  archivo: IArchivoRepository;
  catalogo: ICatalogoRepository;
  bitacora: IBitacoraRepository;
  sesion: ISesionRepository;
  parametro: IParametroRepository;
  administracion: IAdministracionRepository;
}

export interface Relojes {
  /** "Ahora" de los datos (fijo en la simulación: 25 sep 2026 09:40). */
  datos: Reloj;
  /** Hora de eventos de bitácora: avanza en tiempo real desde el "ahora" simulado. */
  eventos: Reloj;
}

export const crearRepositoriosMock = (): Repositorios => ({
  transaccion: new MockTransaccionRepository(),
  alerta: new MockAlertaRepository(almacenamientoNavegador),
  sla: new MockSLARepository(),
  archivo: new MockArchivoRepository(),
  catalogo: new MockCatalogoRepository(),
  bitacora: new MemoriaBitacoraRepository(),
  sesion: new NavegadorSesionRepository(almacenamientoNavegador),
  parametro: new NavegadorParametroRepository(almacenamientoNavegador),
  administracion: new MockAdministracionRepository(),
});

export const crearRelojesSimulados = (): Relojes => {
  const inicio = Date.now();
  return {
    datos: () => new Date(AHORA_SIMULADO),
    eventos: () => new Date(AHORA_SIMULADO + (Date.now() - inicio)),
  };
};

export const crearCasosDeUso = (
  r: Repositorios,
  relojes: Relojes,
  formato: FormatoExportacionService,
) => ({
  obtenerResumenEjecutivo: new ObtenerResumenEjecutivoUseCase(
    r.transaccion,
    r.alerta,
    r.archivo,
    relojes.datos,
  ),
  obtenerDashboardPOS: new ObtenerDashboardPOSUseCase(r.transaccion),
  obtenerDashboardATM: new ObtenerDashboardATMUseCase(r.transaccion, r.archivo),
  obtenerDashboardSLA: new ObtenerDashboardSLAUseCase(r.sla, relojes.datos),
  obtenerDetalleIndicador: new ObtenerDetalleIndicadorUseCase(
    r.transaccion,
    r.bitacora,
    relojes.datos,
    relojes.eventos,
  ),
  exportarDetalleIndicador: new ExportarDetalleIndicadorUseCase(
    r.transaccion,
    formato,
    r.bitacora,
    relojes.datos,
    relojes.eventos,
  ),
  buscarTransacciones: new BuscarTransaccionesUseCase(
    r.transaccion,
    r.bitacora,
    relojes.datos,
    relojes.eventos,
  ),
  obtenerFichaTransaccion: new ObtenerFichaTransaccionUseCase(
    r.transaccion,
    r.bitacora,
    relojes.datos,
    relojes.eventos,
  ),
  exportarTrazabilidad: new ExportarTrazabilidadUseCase(
    r.transaccion,
    formato,
    r.bitacora,
    relojes.datos,
    relojes.eventos,
  ),
  exportarFicha: new ExportarFichaUseCase(
    r.transaccion,
    formato,
    r.bitacora,
    relojes.datos,
    relojes.eventos,
  ),
  obtenerEjemplosBusqueda: new ObtenerEjemplosBusquedaUseCase(r.transaccion),
  obtenerAlertas: new ObtenerAlertasUseCase(r.alerta),
  obtenerDetalleAlerta: new ObtenerDetalleAlertaUseCase(r.alerta, r.transaccion),
  cambiarEstadoAlerta: new CambiarEstadoAlertaUseCase(r.alerta, r.bitacora, relojes.eventos),
  exportarAlertas: new ExportarAlertasUseCase(
    r.alerta,
    formato,
    r.bitacora,
    relojes.datos,
    relojes.eventos,
  ),
  obtenerReporteNoMatch: new ObtenerReporteNoMatchUseCase(r.transaccion, relojes.datos),
  exportarNoMatch: new ExportarNoMatchUseCase(
    r.transaccion,
    formato,
    r.bitacora,
    relojes.datos,
    relojes.eventos,
  ),
  obtenerSesion: new ObtenerSesionUseCase(r.sesion),
  iniciarSesion: new IniciarSesionUseCase(r.sesion, r.bitacora, relojes.eventos),
  cerrarSesion: new CerrarSesionUseCase(r.sesion, r.bitacora, relojes.eventos),
  registrarEvento: new RegistrarEventoUseCase(r.bitacora, relojes.eventos),
  obtenerBitacora: new ObtenerBitacoraUseCase(r.bitacora),
  obtenerCatalogos: new ObtenerCatalogosUseCase(r.catalogo),
  obtenerParametros: new ObtenerParametrosUseCase(r.parametro),
  obtenerLayouts: new ObtenerLayoutsUseCase(r.administracion, relojes.datos),
  obtenerModeloSemantico: new ObtenerModeloSemanticoUseCase(r.administracion),
  obtenerPosturaSeguridad: new ObtenerPosturaSeguridadUseCase(r.administracion),
  actualizarParametro: new ActualizarParametroUseCase(r.parametro, r.bitacora, relojes.eventos),
});

export type CasosDeUso = ReturnType<typeof crearCasosDeUso>;

export interface Dependencias {
  casosDeUso: CasosDeUso;
  relojes: Relojes;
}

/**
 * Composition root. Para conectar el backend real solo se sustituyen aquí las
 * implementaciones de `Repositorios`; domain, application y presentation no cambian.
 */
export const crearDependencias = (
  repositorios: Repositorios = crearRepositoriosMock(),
  relojes: Relojes = crearRelojesSimulados(),
): Dependencias => ({
  casosDeUso: crearCasosDeUso(repositorios, relojes, new FormatoExportacionService()),
  relojes,
});
