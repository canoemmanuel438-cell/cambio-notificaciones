import { useMemo } from "react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FiltrosGlobales } from "@/domain/entities/Filtros";
import {
  CIRCUITOS,
  ETIQUETAS_CIRCUITO,
  ETIQUETAS_ORIGEN,
  ORIGENES_POS,
} from "@/domain/entities/Transaccion";
import { cn } from "@/lib/utils";
import { filtrosGlobalesDesdeUI } from "@/presentation/adapters/filtros";
import { Segmentado } from "@/presentation/components/ui-monitor/Monitor";
import { useAhora, useCatalogos } from "@/presentation/hooks/useMonitor";
import { useFiltrosGlobalesStore, type Periodo } from "@/presentation/stores/filtrosGlobalesStore";
import { formatearFecha } from "@/shared/utils/formato";

const TODOS = "__todos";

export function useFiltrosGlobales(incluirPOS = false): FiltrosGlobales {
  const { periodo, desde, hasta, adquirente, emisor, origen, circuito } = useFiltrosGlobalesStore();
  const ahora = useAhora();
  return useMemo(
    () =>
      filtrosGlobalesDesdeUI(
        { periodo, desde, hasta, adquirente, emisor, origen, circuito },
        ahora,
        incluirPOS,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [periodo, desde, hasta, adquirente, emisor, origen, circuito, incluirPOS, ahora.getTime()],
  );
}

function Filtro({
  etiqueta,
  valor,
  opciones,
  onCambiar,
}: {
  etiqueta: string;
  valor: string;
  opciones: { valor: string; etiqueta: string }[];
  onCambiar: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
      {etiqueta}
      <Select value={valor || TODOS} onValueChange={(v) => onCambiar(v === TODOS ? "" : v)}>
        <SelectTrigger
          className={cn(
            "h-9 w-40 bg-card text-foreground",
            valor && "border-primary ring-1 ring-primary",
          )}
          aria-label={etiqueta}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={TODOS}>Todos</SelectItem>
          {opciones.map((o) => (
            <SelectItem key={o.valor} value={o.valor}>
              {o.etiqueta}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}

export function FiltrosGlobalesBar({ incluirPOS = false }: { incluirPOS?: boolean }) {
  const f = useFiltrosGlobalesStore();
  const { data: catalogos } = useCatalogos();
  const ahora = useAhora();

  return (
    <div
      className="panel mb-6 flex flex-wrap items-end gap-4 p-4"
      role="search"
      aria-label="Filtros globales"
    >
      <div className="flex flex-col gap-1 text-xs text-muted-foreground">
        Periodo
        <Segmentado<Periodo>
          etiqueta="Periodo"
          valor={f.periodo}
          onCambiar={(periodo) => f.actualizar({ periodo })}
          opciones={[
            { valor: "7", etiqueta: "7 días" },
            { valor: "30", etiqueta: "30 días" },
            { valor: "60", etiqueta: "60 días" },
            { valor: "PERSONALIZADO", etiqueta: "Personalizado" },
          ]}
        />
      </div>
      {f.periodo === "PERSONALIZADO" && (
        <>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Desde
            <Input
              type="date"
              className="h-9 w-40 border-primary bg-card"
              value={f.desde}
              onChange={(e) => f.actualizar({ desde: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Hasta
            <Input
              type="date"
              className="h-9 w-40 border-primary bg-card"
              value={f.hasta}
              onChange={(e) => f.actualizar({ hasta: e.target.value })}
            />
          </label>
        </>
      )}
      <Filtro
        etiqueta="Adquirente"
        valor={f.adquirente}
        onCambiar={(adquirente) => f.actualizar({ adquirente })}
        opciones={(catalogos?.adquirentes ?? []).map((a) => ({
          valor: a.nombre,
          etiqueta: a.nombre,
        }))}
      />
      <Filtro
        etiqueta="Emisor"
        valor={f.emisor}
        onCambiar={(emisor) => f.actualizar({ emisor })}
        opciones={(catalogos?.emisores ?? []).map((e) => ({ valor: e.nombre, etiqueta: e.nombre }))}
      />
      {incluirPOS && (
        <>
          <Filtro
            etiqueta="Origen"
            valor={f.origen}
            onCambiar={(origen) => f.actualizar({ origen })}
            opciones={ORIGENES_POS.map((o) => ({ valor: o, etiqueta: ETIQUETAS_ORIGEN[o] }))}
          />
          <Filtro
            etiqueta="Circuito"
            valor={f.circuito}
            onCambiar={(circuito) => f.actualizar({ circuito })}
            opciones={CIRCUITOS.map((c) => ({ valor: c, etiqueta: ETIQUETAS_CIRCUITO[c] }))}
          />
        </>
      )}
      <p className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
        <span className="h-2 w-2 rounded-full bg-verde" aria-hidden />
        Actualizado {formatearFecha(ahora.toISOString())}
      </p>
    </div>
  );
}
