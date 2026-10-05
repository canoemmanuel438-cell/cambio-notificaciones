import { enmascararPAN } from "@/domain/entities/Transaccion";
import { Download } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { CategoriaNoMatch } from "@/application/useCases/noMatch";
import { useCasosDeUso } from "@/infrastructure/di/DependencyProvider";
import { DataTable } from "@/presentation/components/data-table/DataTable";
import { EstadoConsulta } from "@/presentation/components/estado-consulta/EstadoConsulta";
import {
  Chip,
  KpiCard,
  Paginador,
  Panel,
  Segmentado,
} from "@/presentation/components/ui-monitor/Monitor";
import { AppShell } from "@/presentation/layouts/AppShell";
import {
  useDescarga,
  usePaginacion,
  useReporteNoMatch,
  useSesion,
} from "@/presentation/hooks/useMonitor";
import {
  formatearDia,
  formatearFecha,
  formatearMoneda,
  formatearMonedaCompacta,
  formatearNumero,
} from "@/shared/utils/formato";

export function ReporteNoMatchPage() {
  const { rol } = useSesion();
  const [categoria, setCategoria] = useState<CategoriaNoMatch>("AUTORIZADAS_NO_COMPENSADAS");
  const { datos, cargando, error } = useReporteNoMatch(categoria);
  const pag = usePaginacion(datos?.filas ?? [], 15);
  const { exportarNoMatch } = useCasosDeUso();
  const { descargar, descargando } = useDescarga();

  return (
    <AppShell
      pantalla="NO_MATCH"
      titulo="Reporte de No Match"
      subtitulo="Solo transacciones sin match entre el proceso online y el proceso de compensación"
      acciones={
        rol?.puedeDescargar ? (
          <Button
            variant="outline"
            className="h-[38px]"
            disabled={descargando}
            onClick={() => descargar(() => exportarNoMatch.execute(categoria, rol.id))}
          >
            <Download className="mr-2 h-4 w-4" aria-hidden /> Exportar a Excel
          </Button>
        ) : null
      }
    >
      <div className="space-y-6">
        <Segmentado<CategoriaNoMatch>
          etiqueta="Categoría"
          valor={categoria}
          onCambiar={setCategoria}
          opciones={[
            {
              valor: "AUTORIZADAS_NO_COMPENSADAS",
              etiqueta: `Autorizadas no compensadas (${datos?.conteos.AUTORIZADAS_NO_COMPENSADAS ?? "…"})`,
            },
            {
              valor: "COMPENSADAS_SIN_AUTORIZACION",
              etiqueta: `Compensadas sin autorización previa (${datos?.conteos.COMPENSADAS_SIN_AUTORIZACION ?? "…"})`,
            },
          ]}
        />
        <EstadoConsulta cargando={cargando} error={error}>
          {datos && (
            <>
              <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                <KpiCard
                  titulo="Transacciones"
                  valor={formatearNumero(datos.resumen.transacciones)}
                />
                <KpiCard titulo="Importe" valor={formatearMonedaCompacta(datos.resumen.importe)} />
                <KpiCard
                  titulo="Más antigua"
                  valor={datos.resumen.masAntigua ? formatearDia(datos.resumen.masAntigua) : "—"}
                />
                <KpiCard titulo="Plazo vencido" valor={formatearNumero(datos.resumen.vencidas)} />
              </div>
              <Panel className="mt-6">
                <EstadoConsulta
                  cargando={false}
                  vacio={datos.filas.length === 0}
                  mensajeVacio="No hay transacciones en esta categoría para los filtros seleccionados."
                >
                  <DataTable
                    etiqueta="Transacciones sin match"
                    filas={pag.visibles}
                    claveDe={(f) => f.transaccion.id}
                    columnas={[
                      {
                        clave: "id",
                        encabezado: "ID",
                        render: (f) => <span className="numeric text-xs">{f.transaccion.id}</span>,
                      },
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
                        clave: "af",
                        encabezado: "Afiliación",
                        render: (f) => <span className="numeric">{f.transaccion.afiliacion}</span>,
                      },
                      {
                        clave: "pan",
                        encabezado: "PAN",
                        render: (f) => (
                          <span className="numeric">{enmascararPAN(f.transaccion.pan)}</span>
                        ),
                      },
                      { clave: "fuente", encabezado: "Fuente", render: (f) => f.fuente },
                      {
                        clave: "archivo",
                        encabezado: "Nombre de archivo",
                        render: (f) => <span className="numeric text-xs">{f.archivo}</span>,
                      },
                      {
                        clave: "aut",
                        encabezado: "Autorización",
                        render: (f) => (
                          <span className="numeric">{f.transaccion.autorizacion || "—"}</span>
                        ),
                      },
                      {
                        clave: "imp",
                        encabezado: "Importe",
                        alineacion: "derecha",
                        render: (f) => (
                          <span className="numeric">{formatearMoneda(f.transaccion.monto)}</span>
                        ),
                      },
                      {
                        clave: "est",
                        encabezado: "Estatus",
                        render: (f) => (
                          <Chip tono={f.estatus === "VENCIDO" ? "rojo" : "gris"}>
                            {f.estatus === "VENCIDO" ? "Vencido" : "En proceso"}
                          </Chip>
                        ),
                      },
                      {
                        clave: "plazo",
                        encabezado: "Plazo",
                        render: (f) =>
                          f.plazo.vencido ? "Vencido" : `Quedan ${f.plazo.diasRestantes} días`,
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
            </>
          )}
        </EstadoConsulta>
      </div>
    </AppShell>
  );
}
