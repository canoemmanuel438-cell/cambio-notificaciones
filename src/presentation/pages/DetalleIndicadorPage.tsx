import { Link } from "@tanstack/react-router";
import { ArrowLeft, Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { definirIndicador, type OrigenIndicador } from "@/domain/entities/Indicador";
import { puedeVerPantalla } from "@/domain/entities/Rol";
import { ETIQUETAS_ESTATUS } from "@/domain/entities/Transaccion";
import { useCasosDeUso } from "@/infrastructure/di/DependencyProvider";
import { DataTable } from "@/presentation/components/data-table/DataTable";
import { EstadoConsulta } from "@/presentation/components/estado-consulta/EstadoConsulta";
import {
  FiltrosGlobalesBar,
  useFiltrosGlobales,
} from "@/presentation/components/filtros/FiltrosGlobalesBar";
import { SemaforoEtapas } from "@/presentation/components/trazabilidad/SemaforoEtapas";
import { Chip, KpiCard, Paginador, Panel } from "@/presentation/components/ui-monitor/Monitor";
import { TONO_ESTATUS } from "@/presentation/components/ui-monitor/tonos";
import { AppShell } from "@/presentation/layouts/AppShell";
import {
  useDescarga,
  useDetalleIndicador,
  usePaginacion,
  useSesion,
} from "@/presentation/hooks/useMonitor";
import {
  formatearFecha,
  formatearMoneda,
  formatearMonedaCompacta,
  formatearNumero,
} from "@/shared/utils/formato";

const DASHBOARD: Record<OrigenIndicador, { to: "/" | "/pos" | "/atm" | "/sla"; etiqueta: string }> =
  {
    EJECUTIVO: { to: "/", etiqueta: "Dashboard" },
    POS: { to: "/pos", etiqueta: "Dashboard POS" },
    ATM: { to: "/atm", etiqueta: "Dashboard ATM" },
    SLA: { to: "/sla", etiqueta: "Dashboard de SLA" },
  };

export function DetalleIndicadorPage({ clave }: { clave: string }) {
  const { rol } = useSesion();
  const origen = definirIndicador(clave)?.origen ?? "EJECUTIVO";
  const filtros = useFiltrosGlobales(origen === "POS");
  const { datos, cargando, error } = useDetalleIndicador(clave, filtros, rol?.id);
  const pag = usePaginacion(datos?.filas ?? [], 15);
  const { exportarDetalleIndicador } = useCasosDeUso();
  const { descargar, descargando } = useDescarga();
  const volver = DASHBOARD[origen];

  return (
    <AppShell
      pantalla={origen}
      titulo={datos?.titulo ?? "Detalle del indicador"}
      subtitulo={datos?.descripcion ?? "Operaciones que forman el indicador"}
      acciones={
        <>
          <Button asChild variant="outline" className="h-[38px]">
            <Link to={volver.to} search={origen === "SLA" ? { fecha: datos?.dia } : {}}>
              <ArrowLeft className="mr-2 h-4 w-4" aria-hidden /> Volver a {volver.etiqueta}
            </Link>
          </Button>
          {rol?.puedeDescargar && datos && datos.filas.length > 0 && (
            <Button
              className="h-[38px]"
              disabled={descargando}
              onClick={() =>
                descargar(() => exportarDetalleIndicador.execute(clave, filtros, rol.id))
              }
            >
              <Download className="mr-2 h-4 w-4" aria-hidden /> Exportar CSV
            </Button>
          )}
        </>
      }
    >
      {origen !== "SLA" && <FiltrosGlobalesBar incluirPOS={origen === "POS"} />}
      <EstadoConsulta cargando={cargando} error={error}>
        {datos && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
              <KpiCard titulo="Operaciones" valor={formatearNumero(datos.resumen.operaciones)} />
              <KpiCard
                acento="turquesa"
                titulo="Importe"
                valor={formatearMonedaCompacta(datos.resumen.importe)}
              />
              <KpiCard
                acento="naranja"
                titulo="Con inconsistencia"
                valor={formatearNumero(datos.resumen.conInconsistencia)}
              />
              <KpiCard
                acento="gris"
                titulo="En proceso"
                valor={formatearNumero(datos.resumen.enProceso)}
              />
            </div>

            <Panel
              titulo="Operaciones que forman el indicador"
              subtitulo="Abre una ficha para ver la evidencia por etapa y archivo."
            >
              <EstadoConsulta
                cargando={false}
                vacio={datos.filas.length === 0}
                mensajeVacio="No hay operaciones para este indicador con los filtros seleccionados."
              >
                <DataTable
                  etiqueta="Operaciones del indicador"
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
                    { clave: "emi", encabezado: "Emisor", render: (f) => f.transaccion.emisor },
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
                      render: (f) =>
                        rol && puedeVerPantalla(rol, "TRAZABILIDAD") ? (
                          <Button asChild size="sm" variant="outline">
                            <Link
                              to="/trazabilidad/$id"
                              params={{ id: f.transaccion.id }}
                              search={{ desde: clave }}
                            >
                              Ver ficha
                            </Link>
                          </Button>
                        ) : null,
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
    </AppShell>
  );
}
