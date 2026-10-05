const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

const moneda = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  currencyDisplay: "narrowSymbol",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const numero = new Intl.NumberFormat("es-MX");
const decimal1 = new Intl.NumberFormat("es-MX", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const decimal2 = new Intl.NumberFormat("es-MX", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** $1,234.56 */
export const formatearMoneda = (valor: number): string => moneda.format(valor);

/** "$2.35 M", "$850.2 mil" o "$640.00". */
export const formatearMonedaCompacta = (valor: number): string => {
  const abs = Math.abs(valor);
  if (abs >= 1_000_000) return `$${decimal2.format(valor / 1_000_000)} M`;
  if (abs >= 1_000) return `$${decimal1.format(valor / 1_000)} mil`;
  return formatearMoneda(valor);
};

export const formatearNumero = (valor: number): string => numero.format(valor);

export const formatearPorcentaje = (valor: number): string => `${decimal1.format(valor)}%`;

const pad = (n: number) => String(n).padStart(2, "0");

const partes = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d;
};

/** "25 sep 2026 09:40" (hora de la operación, sin conversión de zona). */
export const formatearFecha = (iso: string): string => {
  const d = partes(iso);
  if (!d) return "—";
  return `${d.getUTCDate()} ${MESES[d.getUTCMonth()]} ${d.getUTCFullYear()} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
};

export const formatearFechaSegundos = (iso: string): string => {
  const d = partes(iso);
  if (!d) return "—";
  return `${formatearFecha(iso)}:${pad(d.getUTCSeconds())}`;
};

/** "25 sep 2026" */
export const formatearDia = (isoODia: string): string => {
  const d = partes(isoODia.length === 10 ? `${isoODia}T00:00:00.000Z` : isoODia);
  if (!d) return "—";
  return `${d.getUTCDate()} ${MESES[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};

/** "25 sep" */
export const formatearDiaCorto = (isoODia: string): string => {
  const d = partes(isoODia.length === 10 ? `${isoODia}T00:00:00.000Z` : isoODia);
  if (!d) return "—";
  return `${d.getUTCDate()} ${MESES[d.getUTCMonth()]}`;
};

/** Minuto del día → "07:30". */
export const minutosAHora = (minutos: number): string => {
  const m = Math.round(minutos);
  return `${pad(Math.floor(m / 60) % 24)}:${pad(m % 60)}`;
};

export const formatearMinutos = (minutos: number): string =>
  minutos >= 60
    ? `${Math.floor(minutos / 60)} h ${Math.round(minutos % 60)} min`
    : `${Math.round(minutos)} min`;
