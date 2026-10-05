import {
  CIRCUITOS,
  OPERACIONES_ATM,
  ORIGENES_POS,
  type Circuito,
  type EstadoEtapa,
  type EtapaCiclo,
  type EtapaTransaccion,
  type OperacionATM,
  type OrigenPOS,
  type TipoInconsistencia,
  type Transaccion,
} from "@/domain/entities/Transaccion";
import type { EtapaRaw, TransaccionRaw } from "@/infrastructure/mock/data/generador";

const ETAPAS: Record<EtapaRaw["stage"], EtapaCiclo> = {
  AUT: "AUTORIZACION",
  COMP: "COMPENSACION",
  LIQ: "LIQUIDACION",
  INT: "INTERCAMBIO",
  ENV: "ENVIO",
};
const ESTADOS: Record<EtapaRaw["status"], EstadoEtapa> = {
  OK: "COMPLETADO",
  PEND: "PENDIENTE",
  ERR: "INCONSISTENCIA",
  NA: "NO_APLICA",
};
const INCONSISTENCIAS: TipoInconsistencia[] = [
  "AUTORIZADA_SIN_COMPENSAR",
  "DISCREPANCIA_IMPORTE",
  "SIN_MATCH_TLF_STATS",
  "COMPENSADA_SIN_AUTORIZACION",
  "INCONSISTENCIA_LIQUIDACION",
  "RECHAZO_INTERCAMBIO",
  "FALLO_ENVIO",
  "PLAZO_VENCIDO",
  "DUPLICADO",
];

const enLista = <T extends string>(
  lista: readonly T[],
  valor: string | undefined,
): T | undefined =>
  valor !== undefined && (lista as readonly string[]).includes(valor) ? (valor as T) : undefined;

export const TransaccionMapper = {
  etapaDesdeRaw(raw: EtapaRaw): EtapaTransaccion {
    return {
      etapa: ETAPAS[raw.stage],
      estado: ESTADOS[raw.status],
      fuente: raw.source,
      archivo: raw.file,
    };
  },

  desdeRaw(raw: TransaccionRaw): Transaccion {
    return {
      id: raw.tx_id,
      canal: raw.channel,
      fecha: raw.ts,
      adquirente: raw.acquirer_name,
      adquirenteId: raw.acquirer_id,
      emisor: raw.issuer_name,
      emisorId: raw.issuer_id,
      afiliacion: raw.merchant_id,
      pan: raw.pan,
      referencia: raw.reference,
      autorizacion: raw.auth_code,
      tipoTarjeta: raw.card_type === "C" ? "CREDITO" : "DEBITO",
      monto: raw.amount,
      tipoMensaje: raw.mti,
      codigoDC: raw.dc,
      archivoOrigen: raw.original_file,
      importeCompensado: raw.cleared_amount,
      aprobada: raw.approved,
      motivoRechazo: raw.reject_code
        ? { codigo: raw.reject_code, descripcion: raw.reject_desc ?? "" }
        : undefined,
      circuito: enLista<Circuito>(CIRCUITOS, raw.circuit),
      origen: enLista<OrigenPOS>(ORIGENES_POS, raw.origin),
      operacionATM: enLista<OperacionATM>(OPERACIONES_ATM, raw.atm_op),
      etapas: raw.stages.map((s) => TransaccionMapper.etapaDesdeRaw(s)),
      inconsistencia: enLista<TipoInconsistencia>(INCONSISTENCIAS, raw.issue),
      duplicidad: raw.dup
        ? {
            llavePET: raw.dup.pet_key,
            rol: raw.dup.role,
            contraparteId: raw.dup.peer_id,
            registro: {
              archivo: raw.dup.file,
              linea: raw.dup.line,
              horaRecepcion: raw.dup.received_at,
            },
          }
        : undefined,
      posteo: raw.posting ? (raw.posting === "OK" ? "COMPLETADO" : "PENDIENTE") : undefined,
      deposito: raw.deposit ? (raw.deposit === "OK" ? "COMPLETADO" : "PENDIENTE") : undefined,
      aclaracion: raw.claim ? (raw.claim === "OPEN" ? "ABIERTA" : "RESUELTA") : undefined,
    };
  },

  listaDesdeRaw(raws: TransaccionRaw[]): Transaccion[] {
    return raws.map((raw) => TransaccionMapper.desdeRaw(raw));
  },
};
