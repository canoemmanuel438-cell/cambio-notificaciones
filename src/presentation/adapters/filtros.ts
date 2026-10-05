import type { CriteriosBusqueda, FiltrosGlobales } from "@/domain/entities/Filtros";
import type { Circuito, EstatusTransaccion, OrigenPOS } from "@/domain/entities/Transaccion";
import type {
  ValoresBusqueda,
  ValoresFiltrosGlobales,
} from "@/presentation/stores/filtrosGlobalesStore";

const DIA = 86_400_000;
const opcional = (v: string) => (v ? v : undefined);

/** Traduce los controles de UI a filtros de dominio (sin reglas de negocio). */
export const filtrosGlobalesDesdeUI = (
  v: ValoresFiltrosGlobales,
  ahora: Date,
  incluirPOS: boolean,
): FiltrosGlobales => {
  let rango;
  if (v.periodo === "PERSONALIZADO" && v.desde && v.hasta) {
    rango = { desde: `${v.desde}T00:00:00.000Z`, hasta: `${v.hasta}T23:59:59.999Z` };
  } else {
    const dias = v.periodo === "PERSONALIZADO" ? 30 : Number(v.periodo);
    const hoy = Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), ahora.getUTCDate());
    rango = { desde: new Date(hoy - (dias - 1) * DIA).toISOString(), hasta: ahora.toISOString() };
  }
  return {
    rango,
    adquirente: opcional(v.adquirente),
    emisor: opcional(v.emisor),
    origen: incluirPOS ? (opcional(v.origen) as OrigenPOS | undefined) : undefined,
    circuito: incluirPOS ? (opcional(v.circuito) as Circuito | undefined) : undefined,
  };
};

export const criteriosDesdeUI = (v: ValoresBusqueda): CriteriosBusqueda => {
  const monto = v.monto.trim() ? Number(v.monto.replace(/[$,\s]/g, "")) : undefined;
  return {
    id: opcional(v.id.trim()),
    adquirente: opcional(v.adquirente),
    emisor: opcional(v.emisor),
    pan: opcional(v.pan.trim()),
    referencia: opcional(v.referencia.trim()),
    fecha: opcional(v.fecha),
    monto: monto !== undefined && !Number.isNaN(monto) ? monto : undefined,
    afiliacion: opcional(v.afiliacion.trim()),
    autorizacion: opcional(v.autorizacion.trim()),
    estatus: opcional(v.estatus) as EstatusTransaccion | undefined,
  };
};

export const valoresDesdeCriterios = (
  c: CriteriosBusqueda,
  base: ValoresBusqueda,
): ValoresBusqueda => ({
  ...base,
  ...Object.fromEntries(
    Object.entries(c)
      .filter(([, x]) => x !== undefined)
      .map(([k, x]) => [k, String(x)]),
  ),
});
