import { Link } from "@tanstack/react-router";
import { ArrowDownRight, ArrowRight, ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import type { EstadoEtapa } from "@/domain/entities/Transaccion";
import { ETIQUETAS_ESTADO_ETAPA } from "@/domain/entities/Transaccion";
import { cn } from "@/lib/utils";

export type Tono = "verde" | "rojo" | "ambar" | "gris" | "azul";

const TONOS: Record<Tono, string> = {
  verde: "bg-verde-suave text-verde",
  rojo: "bg-rojo-suave text-rojo",
  ambar: "bg-ambar-suave text-ambar",
  gris: "bg-pendiente-suave text-muted-foreground",
  azul: "bg-accent text-accent-foreground",
};

export function Chip({
  tono,
  children,
  className,
}: {
  tono: Tono;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium",
        TONOS[tono],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Panel({
  titulo,
  subtitulo,
  acciones,
  children,
  className,
}: {
  titulo?: string;
  subtitulo?: string;
  acciones?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("panel p-5", className)} aria-label={titulo}>
      {(titulo || acciones) && (
        <header className="mb-4 flex flex-wrap items-start justify-between gap-2">
          <div>
            {titulo && (
              <h2 className="text-base font-bold text-navy dark:text-foreground">{titulo}</h2>
            )}
            {subtitulo && <p className="mt-0.5 text-xs text-muted-foreground">{subtitulo}</p>}
          </div>
          {acciones}
        </header>
      )}
      {children}
    </section>
  );
}

const ACENTOS = {
  primario: "border-t-navy",
  turquesa: "border-t-serie-2",
  naranja: "border-t-naranja",
  gris: "border-t-serie-4",
  rojo: "border-t-rojo-solido",
  verde: "border-t-verde-solido",
} as const;

export function KpiCard({
  titulo,
  valor,
  nota,
  tendencia,
  acento = "primario",
  detalle,
}: {
  acento?: "primario" | "turquesa" | "naranja" | "gris" | "rojo" | "verde";
  titulo: string;
  valor: string;
  nota?: string;
  tendencia?: { direccion: "arriba" | "abajo"; positiva: boolean } | undefined;
  /** Clave del indicador (domain/entities/Indicador): vuelve la tarjeta un enlace a las operaciones que la forman. */
  detalle?: string;
}) {
  const Icono = tendencia?.direccion === "abajo" ? ArrowDownRight : ArrowUpRight;
  const clases = cn("panel flex flex-col gap-1 border-t-4 p-4", ACENTOS[acento]);
  const contenido = (
    <>
      <span className="text-xs font-semibold leading-snug">{titulo}</span>
      <span className="flex items-center gap-1.5 text-2xl font-bold tracking-tight">
        {valor}
        {tendencia && (
          <Icono
            className={cn("h-4 w-4", tendencia.positiva ? "text-verde" : "text-rojo")}
            aria-label={tendencia.positiva ? "Tendencia favorable" : "Tendencia desfavorable"}
          />
        )}
      </span>
      {nota && <span className="text-xs text-muted-foreground">{nota}</span>}
      {detalle && (
        <span className="mt-auto flex items-center gap-1 pt-1 text-xs font-medium text-primary">
          Ver operaciones <ArrowRight className="h-3 w-3" aria-hidden />
        </span>
      )}
    </>
  );
  if (!detalle) return <div className={clases}>{contenido}</div>;
  return (
    <Link
      to="/detalle/$clave"
      params={{ clave: detalle }}
      title="Ver las operaciones que forman este indicador"
      className={cn(
        clases,
        "transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
    >
      {contenido}
    </Link>
  );
}

const PUNTO: Record<EstadoEtapa, string> = {
  COMPLETADO: "bg-verde",
  PENDIENTE: "bg-pendiente",
  INCONSISTENCIA: "bg-rojo",
  NO_APLICA: "border border-dashed border-pendiente bg-transparent",
};

export function PuntoSemaforo({ estado, etiqueta }: { estado: EstadoEtapa; etiqueta?: string }) {
  const texto = `${etiqueta ? `${etiqueta}: ` : ""}${ETIQUETAS_ESTADO_ETAPA[estado]}`;
  return (
    <span
      className={cn("inline-block h-3 w-3 shrink-0 rounded-full", PUNTO[estado])}
      title={texto}
      role="img"
      aria-label={texto}
    />
  );
}

export function LeyendaSemaforo() {
  return (
    <ul
      className="flex flex-wrap gap-4 text-xs text-muted-foreground"
      aria-label="Leyenda del semáforo"
    >
      {(Object.keys(PUNTO) as EstadoEtapa[]).map((e) => (
        <li key={e} className="flex items-center gap-1.5">
          <PuntoSemaforo estado={e} />
          {ETIQUETAS_ESTADO_ETAPA[e]}
        </li>
      ))}
    </ul>
  );
}

export function Paginador({
  pagina,
  paginas,
  onCambiar,
  total,
}: {
  pagina: number;
  paginas: number;
  total: number;
  onCambiar: (p: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 pt-3">
      <span className="text-xs text-muted-foreground">
        Página {pagina} de {paginas} · {total} registros
      </span>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={pagina <= 1}
          onClick={() => onCambiar(pagina - 1)}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden /> Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={pagina >= paginas}
          onClick={() => onCambiar(pagina + 1)}
        >
          Siguiente <ChevronRight className="h-4 w-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
}

export function Segmentado<T extends string>({
  opciones,
  valor,
  onCambiar,
  etiqueta,
}: {
  opciones: { valor: T; etiqueta: string }[];
  valor: T;
  onCambiar: (v: T) => void;
  etiqueta: string;
}) {
  return (
    <div
      role="group"
      aria-label={etiqueta}
      className="inline-flex rounded-md border border-input bg-card p-0.5"
    >
      {opciones.map((o) => (
        <button
          key={o.valor}
          type="button"
          aria-pressed={valor === o.valor}
          onClick={() => onCambiar(o.valor)}
          className={cn(
            "h-8 rounded px-3 text-xs font-medium text-muted-foreground transition-colors",
            valor === o.valor && "bg-accent text-accent-foreground",
          )}
        >
          {o.etiqueta}
        </button>
      ))}
    </div>
  );
}

/** Barras horizontales accesibles (motivos, circuitos, tipos). */
export function BarrasHorizontales({
  datos,
  etiqueta,
  onSeleccionar,
  seleccionado,
}: {
  datos: { clave: string; etiqueta: string; valor: number; detalle?: string }[];
  etiqueta: string;
  onSeleccionar?: (clave: string) => void;
  seleccionado?: string | undefined;
}) {
  const max = Math.max(1, ...datos.map((d) => d.valor));
  return (
    <ul className="space-y-2.5" aria-label={etiqueta}>
      {datos.map((d) => {
        const contenido = (
          <>
            <span className="flex justify-between gap-2 text-xs">
              <span className="truncate">{d.etiqueta}</span>
              <span className="numeric text-muted-foreground">{d.detalle ?? d.valor}</span>
            </span>
            <span className="mt-1 block h-2 rounded-full bg-muted">
              <span
                className={cn(
                  "block h-2 rounded-full bg-primary",
                  seleccionado && seleccionado !== d.clave && "opacity-40",
                )}
                style={{ width: `${(d.valor / max) * 100}%` }}
              />
            </span>
          </>
        );
        return (
          <li key={d.clave}>
            {onSeleccionar ? (
              <button
                type="button"
                className="w-full rounded text-left"
                aria-pressed={seleccionado === d.clave}
                onClick={() => onSeleccionar(d.clave)}
              >
                {contenido}
              </button>
            ) : (
              contenido
            )}
          </li>
        );
      })}
    </ul>
  );
}
