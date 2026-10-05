import {
  ETAPAS_CICLO,
  ETIQUETAS_ESTADO_ETAPA,
  ETIQUETAS_ESTATUS,
  ETIQUETAS_ETAPA,
  ETIQUETAS_ETAPA_CORTA,
  ETIQUETAS_TIPO_MENSAJE,
  claseTrazabilidad,
  enmascararPAN,
  estadoEtapa,
  estatusTransaccion,
  plazoPresentacion,
  type ClaseTrazabilidad,
  type EstadoEtapa,
  type EstatusTransaccion,
  type PlazoPresentacion,
  type Transaccion,
} from "@/domain/entities/Transaccion";
import type { Tabla } from "@/application/services/FormatoExportacionService";
import { formatearMoneda } from "@/shared/utils/formato";

export type TonoMensaje = "exito" | "info" | "alerta" | "error";

export interface MensajeFicha {
  tono: TonoMensaje;
  texto: string;
}

export interface FilaCruce {
  proceso: string;
  fuente: string;
  archivo: string;
  estado: EstadoEtapa;
}

export interface FilaTrazabilidad {
  transaccion: Transaccion;
  estatus: EstatusTransaccion;
  clase: ClaseTrazabilidad;
  plazo: PlazoPresentacion;
}

export interface FichaTransaccion extends FilaTrazabilidad {
  cruce: FilaCruce[];
  mensajes: MensajeFicha[];
  contraparte?: Transaccion | undefined;
}

export const filaTrazabilidad = (t: Transaccion, ahora: Date): FilaTrazabilidad => ({
  transaccion: t,
  estatus: estatusTransaccion(t, ahora),
  clase: claseTrazabilidad(t),
  plazo: plazoPresentacion(t, ahora),
});

/** Tabla de exportación (CSV) de un conjunto de transacciones con su semáforo y plazo. */
export const tablaTrazabilidad = (filas: FilaTrazabilidad[]): Tabla => ({
  columnas: [
    "ID",
    "Canal",
    "Fecha",
    "Adquirente",
    "Emisor",
    "Afiliación",
    "PAN",
    "Referencia",
    "Autorización",
    "Monto",
    ...ETAPAS_CICLO.map((e) => ETIQUETAS_ETAPA_CORTA[e]),
    "Estatus",
    "Plazo",
  ],
  filas: filas.map(({ transaccion: t, estatus, plazo }) => [
    t.id,
    t.canal,
    t.fecha.slice(0, 16).replace("T", " "),
    t.adquirente,
    t.emisor,
    t.afiliacion,
    enmascararPAN(t.pan),
    t.referencia,
    t.autorizacion,
    t.monto.toFixed(2),
    ...ETAPAS_CICLO.map((e) => ETIQUETAS_ESTADO_ETAPA[estadoEtapa(t, e)]),
    ETIQUETAS_ESTATUS[estatus],
    plazo.vencido ? "Vencido" : `Quedan ${plazo.diasRestantes} días`,
  ]),
});

const dias = (n: number) => (n === 1 ? "1 día" : `${n} días`);

export const mensajesFicha = (fila: FilaTrazabilidad): MensajeFicha[] => {
  const { transaccion: t, plazo, clase } = fila;
  const mensajes: MensajeFicha[] = [];
  if (!t.aprobada) {
    const motivo = t.motivoRechazo
      ? `: ${t.motivoRechazo.codigo} ${t.motivoRechazo.descripcion}`
      : "";
    mensajes.push({ tono: "error", texto: `Transacción rechazada en autorización${motivo}.` });
    return mensajes;
  }
  if (t.duplicidad?.rol === "DUPLICADO") {
    mensajes.push({
      tono: "error",
      texto: `Registro duplicado de ${t.duplicidad.contraparteId}, se retuvo en compensación para evitar un cargo doble.`,
    });
  }
  if (t.duplicidad?.rol === "ORIGINAL") {
    mensajes.push({
      tono: "alerta",
      texto: `Este registro original tiene un duplicado: ${t.duplicidad.contraparteId}.`,
    });
  }
  switch (t.inconsistencia) {
    case "AUTORIZADA_SIN_COMPENSAR":
      mensajes.push(
        plazo.vencido
          ? {
              tono: "error",
              texto: "Autorizada y sin compensar. El plazo de presentación está vencido.",
            }
          : {
              tono: "alerta",
              texto: `Autorizada y aún sin compensar. Quedan ${dias(plazo.diasRestantes)}.`,
            },
      );
      break;
    case "DISCREPANCIA_IMPORTE":
      mensajes.push({
        tono: "error",
        texto: `El importe de compensación (${formatearMoneda(t.importeCompensado ?? 0)}) no coincide con el autorizado (${formatearMoneda(t.monto)}).`,
      });
      break;
    case "COMPENSADA_SIN_AUTORIZACION":
      mensajes.push({
        tono: "error",
        texto: "La transacción llegó a compensación sin una autorización online previa.",
      });
      break;
    case "SIN_MATCH_TLF_STATS":
      mensajes.push({
        tono: "error",
        texto: "El registro del TLF no encontró su par en el archivo STATS.",
      });
      break;
    case "INCONSISTENCIA_LIQUIDACION":
      mensajes.push({ tono: "error", texto: "Se detectó una inconsistencia en la liquidación." });
      break;
    case "RECHAZO_INTERCAMBIO":
      mensajes.push({ tono: "error", texto: "El registro fue rechazado en el intercambio." });
      break;
    case "FALLO_ENVIO":
      mensajes.push({ tono: "error", texto: "Falló el envío del archivo de intercambio." });
      break;
    case "PLAZO_VENCIDO":
      break;
    default:
      break;
  }
  if (fila.estatus === "VENCIDA") {
    mensajes.push({
      tono: "error",
      texto:
        "Vencida: expiró el plazo de presentación sin lograr el match en todas las etapas. El sistema dejó de monitorearla.",
    });
    return mensajes;
  }
  if (clase === "CICLO_COMPLETO" && mensajes.length === 0) {
    mensajes.push({
      tono: "exito",
      texto: "Ciclo conciliado: la transacción completó todas las etapas.",
    });
  } else if (clase === "PENDIENTE" && !t.inconsistencia) {
    mensajes.push({
      tono: "info",
      texto: `En proceso dentro del plazo. Quedan ${dias(plazo.diasRestantes)} para su presentación.`,
    });
  }
  return mensajes;
};

export const construirFicha = (
  t: Transaccion,
  ahora: Date,
  contraparte?: Transaccion,
): FichaTransaccion => {
  const fila = filaTrazabilidad(t, ahora);
  return {
    ...fila,
    contraparte,
    mensajes: mensajesFicha(fila),
    cruce: ETAPAS_CICLO.filter((e) => e !== "ENVIO").map((etapa) => {
      const dato = t.etapas.find((x) => x.etapa === etapa);
      return {
        proceso: ETIQUETAS_ETAPA[etapa],
        fuente: dato?.fuente ?? "—",
        archivo: dato?.archivo ?? "—",
        estado: dato?.estado ?? "NO_APLICA",
      };
    }),
  };
};

export const lineasFicha = (ficha: FichaTransaccion): string[] => {
  const t = ficha.transaccion;
  return [
    `ID: ${t.id}`,
    `Canal: ${t.canal}`,
    `Fecha: ${t.fecha.slice(0, 16).replace("T", " ")}`,
    `Adquirente: ${t.adquirente} (${t.adquirenteId})`,
    `Emisor: ${t.emisor} (${t.emisorId})`,
    `Afiliación: ${t.afiliacion}`,
    `Referencia: ${t.referencia}`,
    `Autorización: ${t.autorizacion || "—"}`,
    `Monto: ${formatearMoneda(t.monto)}`,
    `Tipo de mensaje: ${ETIQUETAS_TIPO_MENSAJE[t.tipoMensaje]}`,
    `Código DC: ${t.codigoDC}`,
    `Archivo de origen: ${t.archivoOrigen || "—"}`,
    `Estatus: ${ETIQUETAS_ESTATUS[ficha.estatus]}`,
    ...(t.duplicidad ? [`Llave PET: ${t.duplicidad.llavePET}`] : []),
    "",
    "Cruce de trazabilidad:",
    ...ficha.cruce.map(
      (c) => `${c.proceso} | ${c.fuente} | ${c.archivo} | ${ETIQUETAS_ESTADO_ETAPA[c.estado]}`,
    ),
    "",
    ...ficha.mensajes.map((m) => m.texto),
  ];
};
