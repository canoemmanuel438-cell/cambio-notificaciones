import type { Circuito, EstatusTransaccion, OrigenPOS, Transaccion } from "./Transaccion";

export interface RangoFechas {
  desde: string;
  hasta: string;
}

export interface FiltrosGlobales {
  rango: RangoFechas;
  adquirente?: string | undefined;
  emisor?: string | undefined;
  origen?: OrigenPOS | undefined;
  circuito?: Circuito | undefined;
}

export interface CriteriosBusqueda {
  id?: string | undefined;
  adquirente?: string | undefined;
  emisor?: string | undefined;
  pan?: string | undefined;
  referencia?: string | undefined;
  fecha?: string | undefined; // YYYY-MM-DD
  monto?: number | undefined;
  afiliacion?: string | undefined;
  autorizacion?: string | undefined;
  /** Se evalúa en el caso de uso (depende del "ahora"). */
  estatus?: EstatusTransaccion | undefined;
}

export const esRangoValido = (rango: RangoFechas): boolean => {
  const desde = Date.parse(rango.desde);
  const hasta = Date.parse(rango.hasta);
  if (Number.isNaN(desde) || Number.isNaN(hasta)) return false;
  return desde <= hasta;
};

export const dentroDeRango = (fechaIso: string, rango: RangoFechas): boolean => {
  const f = Date.parse(fechaIso);
  return f >= Date.parse(rango.desde) && f <= Date.parse(rango.hasta);
};

/** Días (YYYY-MM-DD, UTC) que abarca el rango. */
export const diasEnRango = (rango: RangoFechas): string[] => {
  const dias: string[] = [];
  const fin = rango.hasta.slice(0, 10);
  let actual = Date.parse(`${rango.desde.slice(0, 10)}T00:00:00.000Z`);
  while (!Number.isNaN(actual)) {
    const dia = new Date(actual).toISOString().slice(0, 10);
    if (dia > fin) break;
    dias.push(dia);
    actual += 86_400_000;
  }
  return dias;
};

export const cumpleFiltrosGlobales = (t: Transaccion, f: FiltrosGlobales): boolean => {
  if (!dentroDeRango(t.fecha, f.rango)) return false;
  if (f.adquirente && t.adquirente !== f.adquirente) return false;
  if (f.emisor && t.emisor !== f.emisor) return false;
  if (f.origen && t.canal === "POS" && t.origen !== f.origen) return false;
  if (f.circuito && t.canal === "POS" && t.circuito !== f.circuito) return false;
  return true;
};

const vacio = (v: unknown): boolean => v === undefined || v === "";

export const tieneCriterios = (c: CriteriosBusqueda): boolean =>
  Object.values(c).some((v) => !vacio(v));

export const cumpleCriterios = (t: Transaccion, c: CriteriosBusqueda): boolean => {
  const igual = (a: string, b: string) => a.trim().toUpperCase() === b.trim().toUpperCase();
  if (c.id && !igual(t.id, c.id)) return false;
  if (c.adquirente && t.adquirente !== c.adquirente) return false;
  if (c.emisor && t.emisor !== c.emisor) return false;
  if (c.pan) {
    const digitos = c.pan.replace(/\D/g, "");
    if (!digitos || !t.pan.includes(digitos)) return false;
  }
  if (c.referencia && !t.referencia.includes(c.referencia.trim())) return false;
  if (c.fecha && t.fecha.slice(0, 10) !== c.fecha) return false;
  if (c.monto !== undefined && Math.abs(t.monto - c.monto) > 0.005) return false;
  if (c.afiliacion && t.afiliacion !== c.afiliacion.trim()) return false;
  if (c.autorizacion && !igual(t.autorizacion, c.autorizacion)) return false;
  return true;
};
