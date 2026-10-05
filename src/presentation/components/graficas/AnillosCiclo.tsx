import { Link } from "@tanstack/react-router";

import { formatearNumero, formatearPorcentaje } from "@/shared/utils/formato";

const COLORES = [
  "var(--navy)",
  "var(--serie-2)",
  "var(--naranja)",
  "var(--serie-4)",
  "var(--verde-solido)",
  "var(--rojo-solido)",
];

/** Anillos concéntricos: cada etapa del ciclo es un arco proporcional a su porcentaje del total. */
export function AnillosCiclo({
  etapas,
  total,
}: {
  etapas: {
    clave: string;
    etiqueta: string;
    cantidad: number;
    porcentaje: number;
    detalle?: string;
  }[];
  total: number;
}) {
  const ancho = 11;
  return (
    <div className="flex flex-col items-center gap-5">
      <svg
        viewBox="0 0 240 240"
        className="h-56 w-56"
        role="img"
        aria-label="Avance del ciclo transaccional por etapa"
      >
        {etapas.map((e, i) => {
          const r = 110 - i * (ancho + 4);
          const c = 2 * Math.PI * r;
          return (
            <g key={e.clave} transform="rotate(-90 120 120)">
              <circle
                cx="120"
                cy="120"
                r={r}
                fill="none"
                stroke="var(--muted)"
                strokeWidth={ancho}
              />
              <circle
                cx="120"
                cy="120"
                r={r}
                fill="none"
                stroke={COLORES[i % COLORES.length]}
                strokeWidth={ancho}
                strokeLinecap="round"
                strokeDasharray={`${(Math.min(100, e.porcentaje) / 100) * c} ${c}`}
              />
            </g>
          );
        })}
        <text x="120" y="114" textAnchor="middle" fontSize="11" fill="var(--muted-foreground)">
          Total
        </text>
        <text
          x="120"
          y="134"
          textAnchor="middle"
          fontSize="18"
          fontWeight="700"
          fill="var(--foreground)"
        >
          {formatearNumero(total)}
        </text>
      </svg>
      <ul className="w-full space-y-2.5 text-sm">
        {etapas.map((e, i) => {
          const fila = (
            <>
              <span
                className="h-3 w-3 shrink-0 rounded-sm"
                style={{ background: COLORES[i % COLORES.length] }}
                aria-hidden
              />
              <span className="flex-1">{e.etiqueta}</span>
              <span className="numeric font-semibold">{formatearNumero(e.cantidad)}</span>
              <span className="numeric w-14 text-right text-xs text-muted-foreground">
                {formatearPorcentaje(e.porcentaje)}
              </span>
            </>
          );
          return (
            <li key={e.clave}>
              {e.detalle ? (
                <Link
                  to="/detalle/$clave"
                  params={{ clave: e.detalle }}
                  title="Ver las operaciones de esta etapa"
                  className="-mx-2 flex items-center gap-3 rounded-md px-2 py-1 hover:bg-muted"
                >
                  {fila}
                </Link>
              ) : (
                <span className="flex items-center gap-3">{fila}</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
