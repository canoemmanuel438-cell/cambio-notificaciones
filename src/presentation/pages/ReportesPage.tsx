import { Link } from "@tanstack/react-router";

import type { EstadoIntegridad } from "@/application/useCases/dashboard/ObtenerResumenEjecutivoUseCase";
import { EstadoConsulta } from "@/presentation/components/estado-consulta/EstadoConsulta";
import {
  FiltrosGlobalesBar,
  useFiltrosGlobales,
} from "@/presentation/components/filtros/FiltrosGlobalesBar";
import { Chip, KpiCard, Panel, type Tono } from "@/presentation/components/ui-monitor/Monitor";
import { AppShell } from "@/presentation/layouts/AppShell";
import { useResumenEjecutivo } from "@/presentation/hooks/useMonitor";
import { formatearNumero, formatearPorcentaje } from "@/shared/utils/formato";

const ESTADO: Record<EstadoIntegridad, { tono: Tono; texto: string }> = {
  CONTINUO: { tono: "azul", texto: "Continuo" },
  EN_TIEMPO: { tono: "verde", texto: "En tiempo" },
  EN_RIESGO: { tono: "ambar", texto: "En riesgo" },
  INCUMPLIDO: { tono: "rojo", texto: "Incumplido" },
};

export function ReportesPage() {
  const filtros = useFiltrosGlobales();
  const { datos, cargando, error } = useResumenEjecutivo(filtros);

  return (
    <AppShell
      pantalla="REPORTES"
      titulo="Reportes"
      subtitulo="Reporte de integridad por fuente y resumen de conciliación del periodo"
    >
      <FiltrosGlobalesBar />
      <EstadoConsulta cargando={cargando} error={error}>
        {datos && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <KpiCard
                detalle="autorizadas"
                titulo="Transacciones autorizadas"
                valor={formatearNumero(datos.kpis.autorizadas)}
              />
              <KpiCard
                detalle="sin-match"
                acento="turquesa"
                titulo="Match online vs. compensación"
                valor={formatearPorcentaje(datos.kpis.tasaMatch)}
              />
              <KpiCard
                detalle="inconsistencias"
                acento="naranja"
                titulo="Con inconsistencia"
                valor={formatearNumero(datos.kpis.conInconsistencia)}
              />
              <KpiCard
                acento="rojo"
                titulo="Alertas abiertas"
                valor={formatearNumero(datos.alertasAbiertas.length)}
              />
            </div>
            <Panel
              titulo="Integridad por fuente"
              subtitulo="Archivos recibidos contra esperados en el periodo"
            >
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="py-2 font-medium">Fuente</th>
                      <th className="font-medium">Archivos recibidos / esperados</th>
                      <th className="text-right font-medium">Registros</th>
                      <th className="text-right font-medium">Match</th>
                      <th className="pl-4 font-medium">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {datos.integridad.map((f) => (
                      <tr key={f.fuente} className="border-t border-border">
                        <td className="py-3 font-medium">
                          <Link
                            to="/detalle/$clave"
                            params={{ clave: f.clave }}
                            className="text-primary underline-offset-2 hover:underline"
                            title="Ver los registros de esta fuente"
                          >
                            {f.fuente}
                          </Link>
                        </td>
                        <td className="numeric">
                          {f.esperados === null ? "Continuo" : `${f.recibidos} / ${f.esperados}`}
                        </td>
                        <td className="numeric text-right">{formatearNumero(f.registros)}</td>
                        <td className="numeric text-right">{formatearPorcentaje(f.tasaMatch)}</td>
                        <td className="pl-4">
                          <Chip tono={ESTADO[f.estado].tono}>{ESTADO[f.estado].texto}</Chip>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
            <p className="text-sm text-muted-foreground">
              El detalle de operaciones sin conciliar está en el{" "}
              <Link
                to="/no-match"
                className="font-medium text-primary underline-offset-2 hover:underline"
              >
                Reporte No Match
              </Link>
              .
            </p>
          </div>
        )}
      </EstadoConsulta>
    </AppShell>
  );
}
