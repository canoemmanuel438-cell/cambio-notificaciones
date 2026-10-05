import { useNavigate } from "@tanstack/react-router";
import { Download, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ESTATUS_TRANSACCION,
  ETAPAS_CICLO,
  ETIQUETAS_ESTATUS,
  ETIQUETAS_ETAPA_CORTA,
} from "@/domain/entities/Transaccion";
import { criteriosDesdeUI, valoresDesdeCriterios } from "@/presentation/adapters/filtros";
import { DataTable } from "@/presentation/components/data-table/DataTable";
import { EstadoConsulta } from "@/presentation/components/estado-consulta/EstadoConsulta";
import { SemaforoEtapas } from "@/presentation/components/trazabilidad/SemaforoEtapas";
import {
  Chip,
  LeyendaSemaforo,
  Paginador,
  Panel,
} from "@/presentation/components/ui-monitor/Monitor";
import { TONO_ESTATUS } from "@/presentation/components/ui-monitor/tonos";
import { AppShell } from "@/presentation/layouts/AppShell";
import {
  useBusquedaTransacciones,
  useCatalogos,
  useDescarga,
  useEjemplosBusqueda,
  usePaginacion,
  useSesion,
} from "@/presentation/hooks/useMonitor";
import { useCasosDeUso } from "@/infrastructure/di/DependencyProvider";
import {
  BUSQUEDA_VACIA,
  useTrazabilidadStore,
  type ValoresBusqueda,
} from "@/presentation/stores/filtrosGlobalesStore";
import { formatearFecha, formatearMoneda } from "@/shared/utils/formato";

const TODOS = "__todos";
const CAMPOS: {
  clave: keyof ValoresBusqueda;
  etiqueta: string;
  tipo?: string;
  placeholder?: string;
}[] = [
  { clave: "id", etiqueta: "ID único", placeholder: "TX-20260925-00000001" },
  { clave: "pan", etiqueta: "PAN", placeholder: "Últimos 4 o completo" },
  { clave: "referencia", etiqueta: "Referencia", placeholder: "23 dígitos" },
  { clave: "fecha", etiqueta: "Fecha", tipo: "date" },
  { clave: "monto", etiqueta: "Monto", placeholder: "1234.56" },
  { clave: "afiliacion", etiqueta: "Número de afiliación", placeholder: "7 dígitos" },
  { clave: "autorizacion", etiqueta: "Número de autorización", placeholder: "6 caracteres" },
];

export function TrazabilidadPage({
  pantalla = "TRAZABILIDAD",
  titulo = "Búsqueda de transacciones",
  subtitulo = "Busca por uno o varios filtros y sigue cada transacción a lo largo del ciclo",
}: { pantalla?: "TRAZABILIDAD" | "MATCH"; titulo?: string; subtitulo?: string } = {}) {
  const { rol } = useSesion();
  const { valores, aplicados, setValores, aplicar } = useTrazabilidadStore();
  const { data: catalogos } = useCatalogos();
  const { data: ejemplos } = useEjemplosBusqueda();
  const { datos, cargando, error } = useBusquedaTransacciones(aplicados, rol?.id);
  const pag = usePaginacion(datos ?? [], 15);
  const navigate = useNavigate();
  const { exportarTrazabilidad } = useCasosDeUso();
  const { descargar, descargando } = useDescarga();

  const set = (clave: keyof ValoresBusqueda, v: string) => setValores({ ...valores, [clave]: v });
  const selectEntidad = (
    clave: "adquirente" | "emisor" | "estatus",
    etiqueta: string,
    opciones: string[],
    etiquetas?: Record<string, string>,
  ) => (
    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
      {etiqueta}
      <Select
        value={valores[clave] || TODOS}
        onValueChange={(v) => set(clave, v === TODOS ? "" : v)}
      >
        <SelectTrigger className="h-9 bg-card text-foreground" aria-label={etiqueta}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={TODOS}>Todos</SelectItem>
          {opciones.map((o) => (
            <SelectItem key={o} value={o}>
              {etiquetas?.[o] ?? o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );

  return (
    <AppShell
      pantalla={pantalla}
      titulo={titulo}
      subtitulo={subtitulo}
      acciones={
        rol?.puedeDescargar && aplicados && (datos?.length ?? 0) > 0 ? (
          <Button
            variant="outline"
            className="h-[38px]"
            disabled={descargando}
            onClick={() => descargar(() => exportarTrazabilidad.execute(aplicados, rol.id))}
          >
            <Download className="mr-2 h-4 w-4" aria-hidden /> Exportar resultados
          </Button>
        ) : null
      }
    >
      <div className="space-y-6">
        <Panel
          titulo="Filtros de búsqueda"
          subtitulo="Puedes combinar varios filtros. Se devuelven los registros que coinciden con todos."
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              aplicar(criteriosDesdeUI(valores));
            }}
            className="space-y-4"
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {CAMPOS.slice(0, 1).map((c) => (
                <label key={c.clave} className="flex flex-col gap-1 text-xs text-muted-foreground">
                  {c.etiqueta}
                  <Input
                    className="numeric h-9 bg-card text-foreground"
                    value={valores[c.clave]}
                    placeholder={c.placeholder}
                    onChange={(e) => set(c.clave, e.target.value)}
                  />
                </label>
              ))}
              {selectEntidad(
                "adquirente",
                "Adquirente",
                (catalogos?.adquirentes ?? []).map((a) => a.nombre),
              )}
              {selectEntidad(
                "emisor",
                "Emisor",
                (catalogos?.emisores ?? []).map((a) => a.nombre),
              )}
              {CAMPOS.slice(1).map((c) => (
                <label key={c.clave} className="flex flex-col gap-1 text-xs text-muted-foreground">
                  {c.etiqueta}
                  <Input
                    type={c.tipo ?? "text"}
                    className="numeric h-9 bg-card text-foreground"
                    value={valores[c.clave]}
                    placeholder={c.placeholder}
                    onChange={(e) => set(c.clave, e.target.value)}
                  />
                </label>
              ))}
              {selectEntidad("estatus", "Estatus", ESTATUS_TRANSACCION, ETIQUETAS_ESTATUS)}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit" className="h-[38px]">
                <Search className="mr-2 h-4 w-4" aria-hidden /> Buscar
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-[38px]"
                onClick={() => {
                  setValores(BUSQUEDA_VACIA);
                  aplicar(null);
                }}
              >
                Limpiar
              </Button>
              {ejemplos && ejemplos.length > 0 && (
                <span className="ml-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  Ejemplos:
                  {ejemplos.map((ej) => (
                    <button
                      key={ej.etiqueta}
                      type="button"
                      className="rounded-full border border-border bg-card px-3 py-1 text-foreground hover:bg-accent"
                      onClick={() => {
                        setValores(valoresDesdeCriterios(ej.criterios, BUSQUEDA_VACIA));
                        aplicar(ej.criterios);
                      }}
                    >
                      {ej.etiqueta}
                    </button>
                  ))}
                </span>
              )}
            </div>
          </form>
        </Panel>

        {aplicados && (
          <Panel titulo="Resultados">
            <EstadoConsulta
              cargando={cargando}
              error={error}
              vacio={(datos?.length ?? 0) === 0}
              mensajeVacio="Ningún registro coincide exactamente con los filtros capturados. Revisa los datos o quita algún filtro."
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <LeyendaSemaforo />
                <span className="text-xs text-muted-foreground">
                  Semáforo: {ETAPAS_CICLO.map((e) => ETIQUETAS_ETAPA_CORTA[e]).join(" · ")}
                </span>
              </div>
              <DataTable
                etiqueta="Resultados de trazabilidad"
                filas={pag.visibles}
                claveDe={(f) => f.transaccion.id}
                columnas={[
                  {
                    clave: "id",
                    encabezado: "ID",
                    render: (f) => <span className="numeric text-xs">{f.transaccion.id}</span>,
                  },
                  { clave: "canal", encabezado: "Canal", render: (f) => f.transaccion.canal },
                  {
                    clave: "fecha",
                    encabezado: "Fecha",
                    render: (f) => formatearFecha(f.transaccion.fecha),
                  },
                  {
                    clave: "adq",
                    encabezado: "Adquirente",
                    render: (f) => f.transaccion.adquirente,
                  },
                  {
                    clave: "monto",
                    encabezado: "Monto",
                    alineacion: "derecha",
                    render: (f) => (
                      <span className="numeric">{formatearMoneda(f.transaccion.monto)}</span>
                    ),
                  },
                  {
                    clave: "sem",
                    encabezado: "Aut · Comp · Liq · Int · Envío",
                    render: (f) => <SemaforoEtapas transaccion={f.transaccion} />,
                  },
                  {
                    clave: "estatus",
                    encabezado: "Estatus",
                    render: (f) => (
                      <Chip tono={TONO_ESTATUS[f.estatus]}>{ETIQUETAS_ESTATUS[f.estatus]}</Chip>
                    ),
                  },
                  {
                    clave: "plazo",
                    encabezado: "Plazo",
                    render: (f) =>
                      !f.transaccion.aprobada ? (
                        "—"
                      ) : f.plazo.vencido ? (
                        <span className="text-rojo">Vencido</span>
                      ) : (
                        `Quedan ${f.plazo.diasRestantes} días`
                      ),
                  },
                  {
                    clave: "ficha",
                    encabezado: "",
                    render: (f) => (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          void navigate({
                            to: "/trazabilidad/$id",
                            params: { id: f.transaccion.id },
                          })
                        }
                      >
                        Ver ficha
                      </Button>
                    ),
                  },
                ]}
              />
              <Paginador
                pagina={pag.pagina}
                paginas={pag.paginas}
                total={pag.total}
                onCambiar={pag.setPagina}
              />
              <p className="mt-3 text-xs text-muted-foreground">
                Plazos de presentación: débito 30 días, crédito 120 días.
              </p>
            </EstadoConsulta>
          </Panel>
        )}
      </div>
    </AppShell>
  );
}
