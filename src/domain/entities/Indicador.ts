import type { Pantalla } from "./Rol";
import {
  CANALES,
  ETAPAS_CICLO,
  ETIQUETAS_ETAPA,
  claseTrazabilidad,
  estaVencida,
  estadoEtapa,
  plazoPresentacion,
  tieneInconsistencia,
  tienePendientes,
  type Canal,
  type EtapaCiclo,
  type Transaccion,
} from "./Transaccion";

/** Dashboard desde el que se abre un indicador; define también el permiso de acceso al detalle. */
export type OrigenIndicador = Extract<Pantalla, "EJECUTIVO" | "POS" | "ATM" | "SLA">;

export interface ContextoIndicador {
  ahora: Date;
  /** Último día del rango consultado (YYYY-MM-DD): base de las métricas DC01 / DC00. */
  diaFinal: string;
}

export interface DefinicionIndicador {
  clave: string;
  titulo: string;
  descripcion: string;
  origen: OrigenIndicador;
  /** Muestra primero las de mayor importe en lugar de las más recientes. */
  ordenPorMonto?: boolean;
  /** Día (YYYY-MM-DD) al que pertenece el indicador, si lo tiene: permite volver al dashboard en ese día. */
  dia?: string;
  /** El indicador no depende de los filtros globales (periodo, adquirente, emisor…): usa todas las operaciones. */
  ignoraFiltros?: boolean;
  incluye: (t: Transaccion, ctx: ContextoIndicador) => boolean;
}

type Definicion = Omit<DefinicionIndicador, "clave">;

/** Autorizada cuya compensación ya fue evaluada (no está pendiente ni es "no aplica"). */
export const esEvaluableMatch = (t: Transaccion): boolean => {
  const comp = estadoEtapa(t, "COMPENSACION");
  return t.aprobada && comp !== "PENDIENTE" && comp !== "NO_APLICA";
};

export const tieneMatchCompensacion = (t: Transaccion): boolean =>
  estadoEtapa(t, "COMPENSACION") === "COMPLETADO" &&
  estadoEtapa(t, "AUTORIZACION") === "COMPLETADO";

export const esPendienteEnPlazo = (t: Transaccion, ahora: Date): boolean =>
  t.aprobada &&
  tienePendientes(t) &&
  !t.inconsistencia &&
  !plazoPresentacion(t, ahora).vencido &&
  !estaVencida(t, ahora);

export const esConInconsistencia = (t: Transaccion, ahora: Date): boolean =>
  tieneInconsistencia(t) || estaVencida(t, ahora);

export const esDuplicado = (t: Transaccion): boolean => t.duplicidad?.rol === "DUPLICADO";

const pos = (t: Transaccion) => t.canal === "POS";
const atm = (t: Transaccion) => t.canal === "ATM";
const posAprobada = (t: Transaccion) => pos(t) && t.aprobada;
const atmAprobada = (t: Transaccion) => atm(t) && t.aprobada;

const dc = (codigo: "DC01" | "DC00") => (t: Transaccion, ctx: ContextoIndicador) =>
  t.fecha.slice(0, 10) === ctx.diaFinal && t.codigoDC === codigo;

const INDICADORES: Record<string, Definicion> = {
  // Dashboard ejecutivo
  autorizadas: {
    titulo: "Transacciones autorizadas",
    descripcion: "Operaciones POS y ATM autorizadas en el periodo",
    origen: "EJECUTIVO",
    incluye: (t) => t.aprobada,
  },
  importe: {
    titulo: "Importe procesado",
    descripcion: "Autorizadas del periodo, de mayor a menor importe",
    origen: "EJECUTIVO",
    ordenPorMonto: true,
    incluye: (t) => t.aprobada,
  },
  "sin-match": {
    titulo: "Sin match online vs. compensación",
    descripcion: "Autorizadas con compensación evaluada que no cuadran con la autorización online",
    origen: "EJECUTIVO",
    incluye: (t) => esEvaluableMatch(t) && !tieneMatchCompensacion(t),
  },
  pendientes: {
    titulo: "Pendientes en plazo",
    descripcion: "Autorizadas en proceso; débito 30 días, crédito 120 días",
    origen: "EJECUTIVO",
    incluye: (t, ctx) => esPendienteEnPlazo(t, ctx.ahora),
  },
  inconsistencias: {
    titulo: "Con inconsistencia",
    descripcion: "Operaciones con No match en alguna etapa o con el plazo de presentación vencido",
    origen: "EJECUTIVO",
    incluye: (t, ctx) => esConInconsistencia(t, ctx.ahora),
  },
  duplicados: {
    titulo: "Duplicados detectados",
    descripcion: "Registros duplicados en archivos TEF, correlacionados con Llave PET",
    origen: "EJECUTIVO",
    incluye: esDuplicado,
  },
  dc01: {
    titulo: "Recibidas con DC01",
    descripcion: "Operaciones del último día del periodo con código DC01",
    origen: "EJECUTIVO",
    incluye: dc("DC01"),
  },
  dc00: {
    titulo: "Recibidas con DC00",
    descripcion: "Operaciones del último día del periodo con código DC00",
    origen: "EJECUTIVO",
    incluye: dc("DC00"),
  },

  // Dashboard POS
  "pos-autorizadas": {
    titulo: "POS autorizadas",
    descripcion: "Operaciones POS autorizadas en el periodo",
    origen: "POS",
    incluye: posAprobada,
  },
  "pos-rechazadas": {
    titulo: "POS rechazadas",
    descripcion: "Operaciones rechazadas en autorización, con su motivo",
    origen: "POS",
    incluye: (t) => pos(t) && !t.aprobada,
  },
  "pos-completadas": {
    titulo: "POS con ciclo completo",
    descripcion: "Autorizadas que completaron todas las etapas del ciclo",
    origen: "POS",
    incluye: (t) => posAprobada(t) && claseTrazabilidad(t) === "CICLO_COMPLETO",
  },
  "pos-pendientes": {
    titulo: "POS pendientes",
    descripcion: "Autorizadas con etapas pendientes dentro del plazo",
    origen: "POS",
    incluye: (t) => posAprobada(t) && claseTrazabilidad(t) === "PENDIENTE",
  },
  "pos-incidencias": {
    titulo: "POS con incidencia",
    descripcion: "Autorizadas con inconsistencia o registro duplicado",
    origen: "POS",
    incluye: (t) =>
      posAprobada(t) && ["CON_INCONSISTENCIA", "DUPLICADA"].includes(claseTrazabilidad(t)),
  },
  "pos-no-compensadas": {
    titulo: "Valores no compensados",
    descripcion: "POS autorizadas cuya compensación aún no se completa",
    origen: "POS",
    ordenPorMonto: true,
    incluye: (t) => posAprobada(t) && estadoEtapa(t, "COMPENSACION") !== "COMPLETADO",
  },
  "pos-comp-completada": {
    titulo: "Compensación completada",
    descripcion: "POS autorizadas con compensación completada",
    origen: "POS",
    incluye: (t) => posAprobada(t) && estadoEtapa(t, "COMPENSACION") === "COMPLETADO",
  },
  "pos-comp-pendiente": {
    titulo: "Compensación pendiente",
    descripcion: "POS autorizadas con compensación pendiente en plazo",
    origen: "POS",
    incluye: (t) => posAprobada(t) && estadoEtapa(t, "COMPENSACION") === "PENDIENTE",
  },
  "pos-posteo-completado": {
    titulo: "Posteo completado",
    descripcion: "POS compensadas ya posteadas",
    origen: "POS",
    incluye: (t) => posAprobada(t) && t.posteo === "COMPLETADO",
  },
  "pos-posteo-pendiente": {
    titulo: "Posteo pendiente",
    descripcion: "POS compensadas sin postear",
    origen: "POS",
    incluye: (t) => posAprobada(t) && t.posteo === "PENDIENTE",
  },
  "pos-deposito-completado": {
    titulo: "Depósito completado",
    descripcion: "POS posteadas con depósito realizado",
    origen: "POS",
    incluye: (t) => posAprobada(t) && t.deposito === "COMPLETADO",
  },
  "pos-deposito-pendiente": {
    titulo: "Depósito pendiente",
    descripcion: "POS posteadas sin depósito",
    origen: "POS",
    incluye: (t) => posAprobada(t) && t.deposito === "PENDIENTE",
  },
  "pos-aclaracion-abierta": {
    titulo: "Aclaraciones abiertas",
    descripcion: "POS autorizadas con una aclaración en curso",
    origen: "POS",
    incluye: (t) => posAprobada(t) && t.aclaracion === "ABIERTA",
  },
  "pos-aclaracion-resuelta": {
    titulo: "Aclaraciones resueltas",
    descripcion: "POS autorizadas con aclaración ya resuelta",
    origen: "POS",
    incluye: (t) => posAprobada(t) && t.aclaracion === "RESUELTA",
  },
  "pos-dc01": {
    titulo: "POS recibidas con DC01",
    descripcion: "Operaciones POS del último día del periodo con código DC01",
    origen: "POS",
    incluye: (t, ctx) => pos(t) && dc("DC01")(t, ctx),
  },
  "pos-dc00": {
    titulo: "POS recibidas con DC00",
    descripcion: "Operaciones POS del último día del periodo con código DC00",
    origen: "POS",
    incluye: (t, ctx) => pos(t) && dc("DC00")(t, ctx),
  },

  // Dashboard ATM
  "atm-total": {
    titulo: "Transacciones ATM",
    descripcion: "Todas las operaciones de cajero del periodo",
    origen: "ATM",
    incluye: atm,
  },
  "atm-aprobadas": {
    titulo: "ATM aprobadas",
    descripcion: "Operaciones de cajero aprobadas",
    origen: "ATM",
    incluye: atmAprobada,
  },
  "atm-rechazadas": {
    titulo: "ATM rechazadas",
    descripcion: "Operaciones de cajero rechazadas",
    origen: "ATM",
    incluye: (t) => atm(t) && !t.aprobada,
  },
  "atm-importe": {
    titulo: "Importe aprobado ATM",
    descripcion: "Operaciones de cajero aprobadas, de mayor a menor importe",
    origen: "ATM",
    ordenPorMonto: true,
    incluye: atmAprobada,
  },
  "atm-retiros": {
    titulo: "Retiros aprobados",
    descripcion: "Retiros de cajero aprobados, de mayor a menor importe",
    origen: "ATM",
    ordenPorMonto: true,
    incluye: (t) => atmAprobada(t) && t.operacionATM === "RETIRO",
  },
  "atm-liquidadas": {
    titulo: "Operaciones liquidadas (SETL)",
    descripcion: "Operaciones ATM aprobadas con liquidación completada",
    origen: "ATM",
    incluye: (t) => atmAprobada(t) && estadoEtapa(t, "LIQUIDACION") === "COMPLETADO",
  },
  "atm-match": {
    titulo: "ATM con match TLF vs. STATS",
    descripcion: "Operaciones de TLF conciliadas contra STATS",
    origen: "ATM",
    incluye: (t) => atmAprobada(t) && estadoEtapa(t, "COMPENSACION") === "COMPLETADO",
  },
  "atm-sin-match": {
    titulo: "ATM sin match TLF vs. STATS",
    descripcion: "Operaciones de TLF sin cruce en STATS",
    origen: "ATM",
    incluye: (t) => atmAprobada(t) && estadoEtapa(t, "COMPENSACION") === "INCONSISTENCIA",
  },
};

/** Fuentes de la tabla de integridad: cada una agrupa los registros que alimenta. */
const FUENTES: Record<
  string,
  { etiqueta: string; descripcion: string; incluye: (t: Transaccion) => boolean }
> = {
  online: {
    etiqueta: "Autorizaciones online",
    descripcion: "Registros POS recibidos por el switch en línea",
    incluye: (t) => pos(t) && t.origen === "ONLINE",
  },
  tlf: { etiqueta: "Archivo TLF", descripcion: "Registros de autorización ATM", incluye: atm },
  stats: {
    etiqueta: "Archivo STATS",
    descripcion: "Registros ATM conciliados contra STATS",
    incluye: atm,
  },
  setl: {
    etiqueta: "Archivo SETL",
    descripcion: "Operaciones ATM esperadas en liquidación",
    incluye: atm,
  },
  "comp-pos": {
    etiqueta: "Compensación POS",
    descripcion: "Registros POS en archivo de compensación",
    incluye: pos,
  },
  tef: {
    etiqueta: "Archivos TEF",
    descripcion: "Registros POS recibidos en archivos TEF",
    incluye: (t) => pos(t) && t.origen === "ARCHIVO",
  },
  epape: {
    etiqueta: "EPAPE (Electronic Payment Advice)",
    descripcion: "Registros POS incluidos en el aviso de pago",
    incluye: pos,
  },
};

/** Día de datos que alimenta cada proceso del SLA (rezago respecto al día de ejecución) y las operaciones que procesa. */
interface ProcesoDetalle {
  nombre: string;
  rezagoDias: number;
  descripcion: (diaDatos: string) => string;
  incluye: (t: Transaccion, diaDatos: string) => boolean;
}

const delDia = (t: Transaccion, dia: string) => t.fecha.slice(0, 10) === dia;

const PROCESOS_SLA: Record<string, ProcesoDetalle> = {
  CARGA_ONLINE: {
    nombre: "Carga de autorizaciones online",
    rezagoDias: 0,
    descripcion: (d) => `Autorizaciones online cargadas el ${diaLegible(d)}`,
    incluye: (t, d) => delDia(t, d) && pos(t) && t.origen === "ONLINE",
  },
  TLF: {
    nombre: "Recepción archivo TLF",
    rezagoDias: 1,
    descripcion: (d) => `Operaciones ATM del ${diaLegible(d)} incluidas en el archivo`,
    incluye: (t, d) => delDia(t, d) && atm(t),
  },
  STATS: {
    nombre: "Recepción archivo STATS",
    rezagoDias: 1,
    descripcion: (d) => `Operaciones ATM del ${diaLegible(d)} incluidas en el archivo`,
    incluye: (t, d) => delDia(t, d) && atm(t),
  },
  SETL: {
    nombre: "Recepción archivo SETL",
    rezagoDias: 1,
    descripcion: (d) => `Operaciones ATM del ${diaLegible(d)} que liquida el archivo SETL`,
    incluye: (t, d) => delDia(t, d) && atmAprobada(t),
  },
  ETL_COMP: {
    nombre: "ETL de compensación",
    rezagoDias: 1,
    descripcion: (d) => `Operaciones POS del ${diaLegible(d)} procesadas por el ETL`,
    incluye: (t, d) => delDia(t, d) && posAprobada(t),
  },
  MATCH: {
    nombre: "Motor de match",
    rezagoDias: 1,
    descripcion: (d) => `Operaciones del ${diaLegible(d)} evaluadas por el motor de match`,
    incluye: (t, d) => delDia(t, d) && t.aprobada && !esDuplicado(t),
  },
  DUP_TEF: {
    nombre: "Detección de duplicados TEF",
    rezagoDias: 0,
    descripcion: (d) => `Duplicados detectados en archivos TEF recibidos el ${diaLegible(d)}`,
    incluye: (t, d) => esDuplicado(t) && t.duplicidad?.registro.horaRecepcion.slice(0, 10) === d,
  },
  ENVIO_INT: {
    nombre: "Envío de archivo de intercambio",
    rezagoDias: 2,
    descripcion: (d) => `Operaciones del ${diaLegible(d)} incluidas en el archivo de intercambio`,
    incluye: (t, d) => delDia(t, d) && t.aprobada && !esDuplicado(t),
  },
};

export const IDS_PROCESO_SLA = Object.keys(PROCESOS_SLA);

export const claveSla = (procesoId: string, dia: string): string => `sla:${procesoId}:${dia}`;
export const claveFuente = (fuente: string): string => `fuente:${fuente}`;
export const claveEtapa = (etapa: EtapaCiclo): string => `etapa:${etapa}`;
export const claveDia = (dia: string, canal?: Canal): string =>
  canal ? `dia:${dia}:${canal}` : `dia:${dia}`;

const diaLegible = (dia: string): string =>
  `${dia.slice(8, 10)}/${dia.slice(5, 7)}/${dia.slice(0, 4)}`;

const diaRelativo = (dia: string, desplazamiento: number): string =>
  new Date(Date.parse(`${dia}T00:00:00.000Z`) + desplazamiento * 86_400_000)
    .toISOString()
    .slice(0, 10);

const definirParametrizado = (clave: string): Definicion | undefined => {
  const [tipo, arg, arg2] = clave.split(":");
  if (tipo === "sla") {
    const proceso = arg && Object.hasOwn(PROCESOS_SLA, arg) ? PROCESOS_SLA[arg] : undefined;
    if (!proceso || !arg2 || !/^\d{4}-\d{2}-\d{2}$/.test(arg2)) return undefined;
    const diaDatos = diaRelativo(arg2, -proceso.rezagoDias);
    return {
      titulo: `${proceso.nombre} · ${diaLegible(arg2)}`,
      descripcion: proceso.descripcion(diaDatos),
      origen: "SLA",
      dia: arg2,
      ignoraFiltros: true,
      incluye: (t) => proceso.incluye(t, diaDatos),
    };
  }
  if (tipo === "etapa") {
    const etapa = ETAPAS_CICLO.find((e) => e === arg);
    if (!etapa) return undefined;
    return {
      titulo: `${ETIQUETAS_ETAPA[etapa]}: completadas`,
      descripcion: `Autorizadas que ya completaron ${ETIQUETAS_ETAPA[etapa].toLowerCase()}`,
      origen: "EJECUTIVO",
      incluye: (t) => t.aprobada && estadoEtapa(t, etapa) === "COMPLETADO",
    };
  }
  if (tipo === "dia") {
    const canal = CANALES.find((c) => c === arg2);
    if (!arg || !/^\d{4}-\d{2}-\d{2}$/.test(arg) || (arg2 !== undefined && !canal))
      return undefined;
    return {
      titulo: `${canal ? `${canal}: ` : ""}Operaciones del ${diaLegible(arg)}`,
      descripcion: "Evolución diaria: todas las operaciones del día",
      origen: canal ?? "EJECUTIVO",
      dia: arg,
      incluye: (t) => t.fecha.slice(0, 10) === arg && (!canal || t.canal === canal),
    };
  }
  if (tipo === "fuente") {
    const fuente = arg ? FUENTES[arg] : undefined;
    if (!fuente) return undefined;
    return {
      titulo: `Integridad por fuente: ${fuente.etiqueta}`,
      descripcion: fuente.descripcion,
      origen: "EJECUTIVO",
      incluye: fuente.incluye,
    };
  }
  return undefined;
};

/** Resuelve la clave de un indicador (fija o parametrizada) a su definición; `undefined` si no existe. */
export const definirIndicador = (clave: string): DefinicionIndicador | undefined => {
  const definicion = Object.hasOwn(INDICADORES, clave)
    ? INDICADORES[clave]
    : definirParametrizado(clave);
  return definicion ? { clave, ...definicion } : undefined;
};
