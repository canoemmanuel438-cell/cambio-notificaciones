import { Link } from "@tanstack/react-router";
import { Download } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FiltroEstadoAlerta, FiltrosAlertas } from "@/application/useCases/alertas";
import {
  ETIQUETAS_ESTADO_ALERTA,
  ETIQUETAS_SEVERIDAD,
  GRUPOS_ALERTA,
  SEVERIDADES,
  type GrupoAlerta,
  type Severidad,
} from "@/domain/entities/Alerta";
import type { Transaccion } from "@/domain/entities/Transaccion";
import { useCasosDeUso } from "@/infrastructure/di/DependencyProvider";
import { DataTable } from "@/presentation/components/data-table/DataTable";
import { EstadoConsulta } from "@/presentation/components/estado-consulta/EstadoConsulta";
import { Chip, KpiCard, Paginador, Panel } from "@/presentation/components/ui-monitor/Monitor";
import { TONO_ESTADO_ALERTA, TONO_SEVERIDAD } from "@/presentation/components/ui-monitor/tonos";
import { AppShell } from "@/presentation/layouts/AppShell";
import {
  useAlertas,
  useCambiarEstadoAlerta,
  useDescarga,
  useDetalleAlerta,
  usePaginacion,
  useSesion,
} from "@/presentation/hooks/useMonitor";
import { formatearFecha } from "@/shared/utils/formato";

const TODOS = "__todos";

function Filtro({
  etiqueta,
  valor,
  opciones,
  onCambiar,
  conTodos = true,
}: {
  etiqueta: string;
  valor: string;
  opciones: { valor: string; etiqueta: string }[];
  onCambiar: (v: string) => void;
  conTodos?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
      {etiqueta}
      <Select value={valor || TODOS} onValueChange={(v) => onCambiar(v === TODOS ? "" : v)}>
        <SelectTrigger className="h-9 w-52 bg-card text-foreground" aria-label={etiqueta}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {conTodos && <SelectItem value={TODOS}>Todos</SelectItem>}
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

function Registro({ titulo, t }: { titulo: string; t: Transaccion }) {
  const d = t.duplicidad;
  return (
    <div className="rounded-md border border-border p-3 text-xs">
      <p className="mb-2 text-sm font-medium">{titulo}</p>
      <dl className="grid grid-cols-[110px_1fr] gap-y-1">
        <dt className="text-muted-foreground">ID</dt>
        <dd className="numeric">{t.id}</dd>
        <dt className="text-muted-foreground">Archivo</dt>
        <dd className="numeric">{d?.registro.archivo}</dd>
        <dt className="text-muted-foreground">Línea</dt>
        <dd className="numeric">{d?.registro.linea}</dd>
        <dt className="text-muted-foreground">Recepción</dt>
        <dd>{d ? formatearFecha(d.registro.horaRecepcion) : "—"}</dd>
        <dt className="text-muted-foreground">Llave PET</dt>
        <dd className="numeric">{d?.llavePET}</dd>
      </dl>
    </div>
  );
}

function DetalleAlertaDialog({ id, onCerrar }: { id: string | null; onCerrar: () => void }) {
  const { rol } = useSesion();
  const { datos, cargando, error } = useDetalleAlerta(id, rol?.id);
  const { cambiar, cambiando } = useCambiarEstadoAlerta(rol?.id);
  return (
    <Dialog open={id !== null} onOpenChange={(o) => !o && onCerrar()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Detalle de la alerta {id}</DialogTitle>
          <DialogDescription>{datos?.alerta.tipo ?? ""}</DialogDescription>
        </DialogHeader>
        <EstadoConsulta cargando={cargando} error={error}>
          {datos && (
            <div className="space-y-4">
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-muted-foreground">Tipo</dt>
                  <dd>{datos.alerta.tipo}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Grupo</dt>
                  <dd>{datos.alerta.grupo}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Etapa donde se detectó</dt>
                  <dd>{datos.alerta.etapa}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Fuente involucrada</dt>
                  <dd className="numeric text-xs">{datos.alerta.fuente}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Fecha</dt>
                  <dd>{formatearFecha(datos.alerta.fecha)}</dd>
                </div>
                <div className="flex gap-2">
                  <Chip tono={TONO_SEVERIDAD[datos.alerta.severidad]}>
                    {ETIQUETAS_SEVERIDAD[datos.alerta.severidad]}
                  </Chip>
                  <Chip tono={TONO_ESTADO_ALERTA[datos.alerta.estado]}>
                    {ETIQUETAS_ESTADO_ALERTA[datos.alerta.estado]}
                  </Chip>
                </div>
              </dl>
              {datos.duplicidad && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Registro titulo="Registro original" t={datos.duplicidad.original} />
                  <Registro titulo="Registro duplicado" t={datos.duplicidad.duplicado} />
                </div>
              )}
              {datos.transaccion && (
                <Link
                  to="/trazabilidad/$id"
                  params={{ id: datos.transaccion.id }}
                  className="inline-block text-sm text-primary underline"
                >
                  Abrir ficha de la transacción
                </Link>
              )}
              <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                {datos.puedeActuar ? (
                  datos.acciones.map((a) => (
                    <Button
                      key={a.destino}
                      variant={a.destino === "CERRADA" ? "default" : "outline"}
                      className="h-[38px]"
                      disabled={cambiando}
                      onClick={() => cambiar({ id: datos.alerta.id, destino: a.destino })}
                    >
                      {a.etiqueta}
                    </Button>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Tu rol puede consultar esta alerta, pero no cambiar su estado.
                  </p>
                )}
              </div>
            </div>
          )}
        </EstadoConsulta>
      </DialogContent>
    </Dialog>
  );
}

export function AlertasPage({ grupoInicial }: { grupoInicial?: string | undefined }) {
  const { rol } = useSesion();
  const [filtros, setFiltros] = useState<FiltrosAlertas>({
    estado: "ACTIVAS",
    grupo: (GRUPOS_ALERTA as readonly string[]).includes(grupoInicial ?? "")
      ? (grupoInicial as GrupoAlerta)
      : undefined,
  });
  const [detalle, setDetalle] = useState<string | null>(null);
  const { datos, cargando, error } = useAlertas(filtros);
  const pag = usePaginacion(datos?.alertas ?? [], 15);
  const { exportarAlertas } = useCasosDeUso();
  const { descargar, descargando } = useDescarga();

  return (
    <AppShell
      pantalla="ALERTAS"
      titulo="Alertas"
      subtitulo="Inconsistencias de negocio y eventos técnicos, con seguimiento de atención"
      acciones={
        rol?.puedeDescargar ? (
          <Button
            variant="outline"
            className="h-[38px]"
            disabled={descargando}
            onClick={() => descargar(() => exportarAlertas.execute(filtros, rol.id))}
          >
            <Download className="mr-2 h-4 w-4" aria-hidden /> Exportar alertas
          </Button>
        ) : null
      }
    >
      <EstadoConsulta cargando={cargando} error={error}>
        {datos && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <KpiCard titulo="Abiertas" valor={String(datos.kpis.abiertas)} />
              <KpiCard titulo="En atención" valor={String(datos.kpis.enAtencion)} />
              <KpiCard titulo="Cerradas" valor={String(datos.kpis.cerradas)} />
            </div>
            <div className="flex flex-wrap gap-2" aria-label="Alertas activas por grupo">
              {datos.porGrupo.map((g) => (
                <button
                  key={g.grupo}
                  type="button"
                  aria-pressed={filtros.grupo === g.grupo}
                  onClick={() =>
                    setFiltros({
                      ...filtros,
                      grupo: filtros.grupo === g.grupo ? undefined : g.grupo,
                    })
                  }
                  className="rounded-full border border-border bg-card px-3 py-1 text-xs aria-pressed:border-primary aria-pressed:bg-accent aria-pressed:text-accent-foreground"
                >
                  {g.grupo} <span className="numeric ml-1 font-semibold">{g.conteo}</span>
                </button>
              ))}
            </div>

            <Panel titulo="Bandeja de alertas" subtitulo="Integrado con Cloud Monitoring">
              <div className="mb-4 flex flex-wrap gap-3">
                <Filtro
                  etiqueta="Grupo"
                  valor={filtros.grupo ?? ""}
                  onCambiar={(v) =>
                    setFiltros({ ...filtros, grupo: (v || undefined) as GrupoAlerta | undefined })
                  }
                  opciones={GRUPOS_ALERTA.map((g) => ({ valor: g, etiqueta: g }))}
                />
                <Filtro
                  etiqueta="Etapa"
                  valor={filtros.etapa ?? ""}
                  onCambiar={(v) => setFiltros({ ...filtros, etapa: v || undefined })}
                  opciones={datos.etapas.map((e) => ({ valor: e, etiqueta: e }))}
                />
                <Filtro
                  etiqueta="Severidad"
                  valor={filtros.severidad ?? ""}
                  onCambiar={(v) =>
                    setFiltros({ ...filtros, severidad: (v || undefined) as Severidad | undefined })
                  }
                  opciones={SEVERIDADES.map((s) => ({
                    valor: s,
                    etiqueta: ETIQUETAS_SEVERIDAD[s],
                  }))}
                />
                <Filtro
                  etiqueta="Estado"
                  conTodos={false}
                  valor={filtros.estado}
                  onCambiar={(v) => setFiltros({ ...filtros, estado: v as FiltroEstadoAlerta })}
                  opciones={[
                    { valor: "ACTIVAS", etiqueta: "Abiertas y en atención" },
                    { valor: "ABIERTA", etiqueta: "Abiertas" },
                    { valor: "EN_ATENCION", etiqueta: "En atención" },
                    { valor: "CERRADA", etiqueta: "Cerradas" },
                    { valor: "TODAS", etiqueta: "Todas" },
                  ]}
                />
              </div>
              <EstadoConsulta
                cargando={false}
                vacio={datos.alertas.length === 0}
                mensajeVacio="No hay alertas con estos filtros."
              >
                <DataTable
                  etiqueta="Bandeja de alertas"
                  filas={pag.visibles}
                  claveDe={(a) => a.id}
                  columnas={[
                    {
                      clave: "fecha",
                      encabezado: "Fecha / hora",
                      render: (a) => formatearFecha(a.fecha),
                    },
                    { clave: "tipo", encabezado: "Tipo de inconsistencia", render: (a) => a.tipo },
                    { clave: "grupo", encabezado: "Grupo", render: (a) => a.grupo },
                    { clave: "etapa", encabezado: "Etapa", render: (a) => a.etapa },
                    {
                      clave: "sev",
                      encabezado: "Severidad",
                      render: (a) => (
                        <Chip tono={TONO_SEVERIDAD[a.severidad]}>
                          {ETIQUETAS_SEVERIDAD[a.severidad]}
                        </Chip>
                      ),
                    },
                    {
                      clave: "estado",
                      encabezado: "Estado",
                      render: (a) => (
                        <Chip tono={TONO_ESTADO_ALERTA[a.estado]}>
                          {ETIQUETAS_ESTADO_ALERTA[a.estado]}
                        </Chip>
                      ),
                    },
                    {
                      clave: "ver",
                      encabezado: "",
                      render: (a) => (
                        <Button size="sm" variant="outline" onClick={() => setDetalle(a.id)}>
                          Ver detalle
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
              </EstadoConsulta>
            </Panel>
          </div>
        )}
      </EstadoConsulta>
      <DetalleAlertaDialog id={detalle} onCerrar={() => setDetalle(null)} />
    </AppShell>
  );
}
