export type Canal = "POS" | "ATM";
export const CANALES: Canal[] = ["POS", "ATM"];

export type EtapaCiclo = "AUTORIZACION" | "COMPENSACION" | "LIQUIDACION" | "INTERCAMBIO" | "ENVIO";
export const ETAPAS_CICLO: EtapaCiclo[] = [
  "AUTORIZACION",
  "COMPENSACION",
  "LIQUIDACION",
  "INTERCAMBIO",
  "ENVIO",
];
export const ETIQUETAS_ETAPA: Record<EtapaCiclo, string> = {
  AUTORIZACION: "Autorización",
  COMPENSACION: "Compensación",
  LIQUIDACION: "Liquidación",
  INTERCAMBIO: "Intercambio",
  ENVIO: "Envío de archivo",
};
export const ETIQUETAS_ETAPA_CORTA: Record<EtapaCiclo, string> = {
  AUTORIZACION: "Aut",
  COMPENSACION: "Comp",
  LIQUIDACION: "Liq",
  INTERCAMBIO: "Int",
  ENVIO: "Envío",
};

export type EstadoEtapa = "COMPLETADO" | "PENDIENTE" | "INCONSISTENCIA" | "NO_APLICA";
export const ETIQUETAS_ESTADO_ETAPA: Record<EstadoEtapa, string> = {
  COMPLETADO: "Completado",
  PENDIENTE: "Pendiente en plazo",
  INCONSISTENCIA: "Inconsistencia o rechazo",
  NO_APLICA: "No aplica",
};

export interface EtapaTransaccion {
  etapa: EtapaCiclo;
  estado: EstadoEtapa;
  fuente: string;
  archivo?: string | undefined;
}

export type TipoTarjeta = "DEBITO" | "CREDITO";
export const ETIQUETAS_TIPO_TARJETA: Record<TipoTarjeta, string> = {
  DEBITO: "Débito",
  CREDITO: "Crédito",
};

export type Circuito = "LOCAL" | "SALIENTE" | "ENTRANTE" | "INTERREDES" | "INTERNACIONAL";
export const CIRCUITOS: Circuito[] = [
  "LOCAL",
  "SALIENTE",
  "ENTRANTE",
  "INTERREDES",
  "INTERNACIONAL",
];
export const ETIQUETAS_CIRCUITO: Record<Circuito, string> = {
  LOCAL: "Local",
  SALIENTE: "Saliente",
  ENTRANTE: "Entrante",
  INTERREDES: "Interredes",
  INTERNACIONAL: "Internacional",
};

export type OrigenPOS = "ONLINE" | "ARCHIVO" | "PAPEL";
export const ORIGENES_POS: OrigenPOS[] = ["ONLINE", "ARCHIVO", "PAPEL"];
export const ETIQUETAS_ORIGEN: Record<OrigenPOS, string> = {
  ONLINE: "Online",
  ARCHIVO: "Archivo (TEF)",
  PAPEL: "Papel",
};

export type OperacionATM = "RETIRO" | "CONSULTA" | "SURCHARGE" | "TAE" | "DONATIVO";
export const OPERACIONES_ATM: OperacionATM[] = [
  "RETIRO",
  "CONSULTA",
  "SURCHARGE",
  "TAE",
  "DONATIVO",
];
export const ETIQUETAS_OPERACION_ATM: Record<OperacionATM, string> = {
  RETIRO: "Retiros",
  CONSULTA: "Consultas",
  SURCHARGE: "Surcharge",
  TAE: "TAE",
  DONATIVO: "Donativos",
};

export type TipoInconsistencia =
  | "AUTORIZADA_SIN_COMPENSAR"
  | "DISCREPANCIA_IMPORTE"
  | "SIN_MATCH_TLF_STATS"
  | "COMPENSADA_SIN_AUTORIZACION"
  | "INCONSISTENCIA_LIQUIDACION"
  | "RECHAZO_INTERCAMBIO"
  | "FALLO_ENVIO"
  | "PLAZO_VENCIDO"
  | "DUPLICADO";

export const ETIQUETAS_INCONSISTENCIA: Record<TipoInconsistencia, string> = {
  AUTORIZADA_SIN_COMPENSAR: "Autorizada sin compensar",
  DISCREPANCIA_IMPORTE: "Discrepancia de importe",
  SIN_MATCH_TLF_STATS: "Sin match TLF vs. STATS",
  COMPENSADA_SIN_AUTORIZACION: "Compensada sin autorización previa",
  INCONSISTENCIA_LIQUIDACION: "Inconsistencia en liquidación",
  RECHAZO_INTERCAMBIO: "Rechazo en intercambio",
  FALLO_ENVIO: "Fallo en envío de archivo",
  PLAZO_VENCIDO: "Plazo de presentación vencido sin match",
  DUPLICADO: "Registro duplicado TEF",
};

export interface MotivoRechazo {
  codigo: string;
  descripcion: string;
}

export interface RegistroArchivo {
  archivo: string;
  linea: number;
  horaRecepcion: string;
}

export interface Duplicidad {
  llavePET: string;
  rol: "ORIGINAL" | "DUPLICADO";
  contraparteId: string;
  registro: RegistroArchivo;
}

export type EstadoProceso = "PENDIENTE" | "COMPLETADO";
export type EstadoAclaracion = "ABIERTA" | "RESUELTA";

/** MTI: 210 respuesta de autorización, 220 aviso financiero, 420 aviso de reversión. */
export type TipoMensaje = "210" | "220" | "420";
export const TIPOS_MENSAJE: TipoMensaje[] = ["210", "220", "420"];
export const ETIQUETAS_TIPO_MENSAJE: Record<TipoMensaje, string> = {
  "210": "210 · Respuesta de autorización",
  "220": "220 · Aviso financiero",
  "420": "420 · Aviso de reversión",
};

export type CodigoDC = "DC01" | "DC00";
export const CODIGOS_DC: CodigoDC[] = ["DC01", "DC00"];

export interface Transaccion {
  id: string;
  canal: Canal;
  fecha: string;
  adquirente: string;
  adquirenteId: string;
  emisor: string;
  emisorId: string;
  afiliacion: string;
  pan: string;
  referencia: string;
  autorizacion: string;
  tipoTarjeta: TipoTarjeta;
  monto: number;
  tipoMensaje: TipoMensaje;
  codigoDC: CodigoDC;
  /** Nombre del archivo tal como llegó al sistema, antes de aplicar reglas operativas. */
  archivoOrigen: string;
  importeCompensado?: number | undefined;
  aprobada: boolean;
  motivoRechazo?: MotivoRechazo | undefined;
  circuito?: Circuito | undefined;
  origen?: OrigenPOS | undefined;
  operacionATM?: OperacionATM | undefined;
  etapas: EtapaTransaccion[];
  inconsistencia?: TipoInconsistencia | undefined;
  duplicidad?: Duplicidad | undefined;
  posteo?: EstadoProceso | undefined;
  deposito?: EstadoProceso | undefined;
  aclaracion?: EstadoAclaracion | undefined;
}

export const PLAZO_PRESENTACION_DIAS: Record<TipoTarjeta, number> = { DEBITO: 30, CREDITO: 120 };
const DIA_MS = 86_400_000;

export interface PlazoPresentacion {
  diasRestantes: number;
  vencido: boolean;
}

export const plazoPresentacion = (t: Transaccion, ahora: Date): PlazoPresentacion => {
  const transcurridos = Math.floor((ahora.getTime() - Date.parse(t.fecha)) / DIA_MS);
  const restantes = PLAZO_PRESENTACION_DIAS[t.tipoTarjeta] - transcurridos;
  return { diasRestantes: Math.max(0, restantes), vencido: restantes <= 0 };
};

export const estadoEtapa = (t: Transaccion, etapa: EtapaCiclo): EstadoEtapa =>
  t.etapas.find((e) => e.etapa === etapa)?.estado ?? "NO_APLICA";

export const tieneInconsistencia = (t: Transaccion): boolean =>
  t.aprobada && t.etapas.some((e) => e.estado === "INCONSISTENCIA");

export const tienePendientes = (t: Transaccion): boolean =>
  t.etapas.some((e) => e.estado === "PENDIENTE");

export type EstatusTransaccion = "MATCH" | "NO_MATCH" | "EN_PROCESO" | "RECHAZADA" | "VENCIDA";
export const ESTATUS_TRANSACCION: EstatusTransaccion[] = [
  "MATCH",
  "NO_MATCH",
  "EN_PROCESO",
  "RECHAZADA",
  "VENCIDA",
];
export const ETIQUETAS_ESTATUS: Record<EstatusTransaccion, string> = {
  MATCH: "Match",
  NO_MATCH: "No match",
  EN_PROCESO: "En proceso",
  RECHAZADA: "Rechazada",
  VENCIDA: "Vencida",
};

const conciliada = (t: Transaccion): boolean => !t.inconsistencia && !tienePendientes(t);

/**
 * Tiempo máximo de vida: una autorizada se monitorea hasta lograr match en todas las etapas
 * o hasta que expira su plazo de presentación, lo que ocurra primero. Si expira sin match, está vencida.
 */
export const estaVencida = (t: Transaccion, ahora: Date): boolean =>
  t.aprobada &&
  t.duplicidad?.rol !== "DUPLICADO" &&
  (t.inconsistencia === "PLAZO_VENCIDO" || (!conciliada(t) && plazoPresentacion(t, ahora).vencido));

export const estatusTransaccion = (t: Transaccion, ahora: Date): EstatusTransaccion => {
  if (!t.aprobada) return "RECHAZADA";
  if (estaVencida(t, ahora)) return "VENCIDA";
  if (t.inconsistencia) return "NO_MATCH";
  if (tienePendientes(t)) return "EN_PROCESO";
  return "MATCH";
};

export type ClaseTrazabilidad =
  "CICLO_COMPLETO" | "PENDIENTE" | "CON_INCONSISTENCIA" | "RECHAZADA" | "DUPLICADA";
export const ETIQUETAS_CLASE: Record<ClaseTrazabilidad, string> = {
  CICLO_COMPLETO: "Ciclo completo",
  PENDIENTE: "Pendiente",
  CON_INCONSISTENCIA: "Con inconsistencia",
  RECHAZADA: "Rechazada",
  DUPLICADA: "Duplicada",
};

export const claseTrazabilidad = (t: Transaccion): ClaseTrazabilidad => {
  if (!t.aprobada) return "RECHAZADA";
  if (t.duplicidad?.rol === "DUPLICADO") return "DUPLICADA";
  if (tieneInconsistencia(t)) return "CON_INCONSISTENCIA";
  if (tienePendientes(t)) return "PENDIENTE";
  return "CICLO_COMPLETO";
};

/** PAN enmascarado: `5579 10•• •••• 1234`. */
export const enmascararPAN = (pan: string): string => {
  const d = pan.replace(/\D/g, "");
  if (d.length < 10) return pan;
  return `${d.slice(0, 4)} ${d.slice(4, 6)}•• •••• ${d.slice(-4)}`;
};
