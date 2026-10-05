import { Link, useNavigate } from "@tanstack/react-router";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ETIQUETAS_SEVERIDAD } from "@/domain/entities/Alerta";
import { claveDia, claveEtapa } from "@/domain/entities/Indicador";
import { ETIQUETAS_ETAPA } from "@/domain/entities/Transaccion";
import {
  META_MATCH,
  type EstadoIntegridad,
} from "@/application/useCases/dashboard/ObtenerResumenEjecutivoUseCase";
import { AnillosCiclo } from "@/presentation/components/graficas/AnillosCiclo";
import { EstadoConsulta } from "@/presentation/components/estado-consulta/EstadoConsulta";
import {
  FiltrosGlobalesBar,
  useFiltrosGlobales,
} from "@/presentation/components/filtros/FiltrosGlobalesBar";
import { Chip, KpiCard, Panel, type Tono } from "@/presentation/components/ui-monitor/Monitor";
import { TONO_SEVERIDAD } from "@/presentation/components/ui-monitor/tonos";
import { AppShell } from "@/presentation/layouts/AppShell";
import { useResumenEjecutivo } from "@/presentation/hooks/useMonitor";
import {
  formatearDiaCorto,
  formatearMonedaCompacta,
  formatearNumero,
  formatearPorcentaje,
} from "@/shared/utils/formato";

const INTEGRIDAD: Record<EstadoIntegridad, { tono: Tono; texto: string }> = {
  CONTINUO: { tono: "azul", texto: "Continuo" },
  EN_TIEMPO: { tono: "verde", texto: "En tiempo" },
  EN_RIESGO: { tono: "ambar", texto: "En riesgo" },
  INCUMPLIDO: { tono: "rojo", texto: "Incumplido" },
};

export function DashboardEjecutivoPage() {
  const filtros = useFiltrosGlobales();
  const { datos, cargando, error } = useResumenEjecutivo(filtros);
  const navigate = useNavigate();

  return (
    <AppShell
      pantalla="EJECUTIVO"
      titulo="Dashboard resumen de transacciones"
      subtitulo="Salud de la operación: volumen, integridad y continuidad del flujo transaccional"
    >
      <FiltrosGlobalesBar />
      <EstadoConsulta cargando={cargando} error={error}>
        {datos && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-8">
              <KpiCard
                detalle="autorizadas"
                titulo="Transacciones autorizadas"
                valor={formatearNumero(datos.kpis.autorizadas)}
                nota={`POS ${formatearNumero(datos.kpis.autorizadasPOS)} · ATM ${formatearNumero(datos.kpis.autorizadasATM)}`}
              />
              <KpiCard
                detalle="importe"
                acento="turquesa"
                titulo="Importe procesado"
                valor={formatearMonedaCompacta(datos.kpis.importeProcesado)}
                nota="Transacciones aprobadas"
              />
              <KpiCard
                detalle="sin-match"
                acento="turquesa"
                titulo="Match online vs. compensación"
                valor={formatearPorcentaje(datos.kpis.tasaMatch)}
                nota={`Meta ${formatearPorcentaje(META_MATCH)}`}
                tendencia={{
                  direccion: datos.kpis.cumpleMetaMatch ? "arriba" : "abajo",
                  positiva: datos.kpis.cumpleMetaMatch,
                }}
              />
              <KpiCard
                detalle="pendientes"
                acento="gris"
                titulo="Pendientes en plazo"
                valor={formatearNumero(datos.kpis.pendientesEnPlazo)}
                nota="Débito 30 d · crédito 120 d"
              />
              <KpiCard
                detalle="inconsistencias"
                acento="naranja"
                titulo="Con inconsistencia"
                valor={formatearNumero(datos.kpis.conInconsistencia)}
                nota={`${formatearPorcentaje(datos.kpis.porcentajeInconsistencia)} del total`}
                tendencia={{ direccion: "arriba", positiva: false }}
              />
              <KpiCard
                detalle="duplicados"
                acento="rojo"
                titulo="Duplicados detectados"
                valor={formatearNumero(datos.kpis.duplicados)}
                nota="Con Llave PET asignada"
              />
              <KpiCard
                detalle="dc01"
                acento="verde"
                titulo="Recibidas con DC01"
                valor={formatearNumero(datos.kpis.dcDelDia.dc01)}
                nota={`Del día ${datos.kpis.dcDelDia.fecha}`}
              />
              <KpiCard
                detalle="dc00"
                acento="gris"
                titulo="Recibidas con DC00"
                valor={formatearNumero(datos.kpis.dcDelDia.dc00)}
                nota={`Del día ${datos.kpis.dcDelDia.fecha}`}
              />
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <Panel
                titulo="Avance del ciclo transaccional"
                subtitulo="Cantidad y % de lo autorizado por etapa"
              >
                <AnillosCiclo
                  total={datos.embudo[0]?.cantidad ?? 0}
                  etapas={datos.embudo.map((e) => ({
                    clave: e.etapa,
                    etiqueta: ETIQUETAS_ETAPA[e.etapa],
                    cantidad: e.cantidad,
                    porcentaje: e.porcentaje,
                    detalle: claveEtapa(e.etapa),
                  }))}
                />
              </Panel>

              <Panel
                titulo="Continuidad del flujo"
                subtitulo={`Volumen diario contra el promedio del periodo (${datos.promedioDiario.toFixed(1)}). Toca un día para ver sus operaciones`}
              >
                <div
                  className="h-56 cursor-pointer"
                  role="img"
                  aria-label="Volumen diario de transacciones"
                >
                  <ResponsiveContainer>
                    <LineChart
                      data={datos.volumenDiario}
                      margin={{ left: -20, right: 8, top: 8 }}
                      onClick={(e) =>
                        e?.activeLabel &&
                        void navigate({
                          to: "/detalle/$clave",
                          params: { clave: claveDia(String(e.activeLabel)) },
                        })
                      }
                    >
                      <CartesianGrid stroke="var(--border)" vertical={false} />
                      <XAxis
                        dataKey="fecha"
                        tickFormatter={formatearDiaCorto}
                        tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                        minTickGap={24}
                      />
                      <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                      <Tooltip
                        labelFormatter={(v) => formatearDiaCorto(String(v))}
                        contentStyle={{
                          background: "var(--card)",
                          border: "1px solid var(--border)",
                          fontSize: 12,
                        }}
                      />
                      <ReferenceLine
                        y={datos.promedioDiario}
                        stroke="var(--serie-2)"
                        strokeDasharray="4 4"
                        label={{
                          value: "Promedio",
                          fontSize: 11,
                          fill: "var(--serie-2)",
                          position: "insideTopRight",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="total"
                        name="Transacciones"
                        stroke="var(--primary)"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Panel>
            </div>

            <div className="grid gap-6 xl:grid-cols-3">
              <Panel
                titulo="Integridad por fuente"
                subtitulo="Archivos recibidos contra esperados"
                className="xl:col-span-2"
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" aria-label="Integridad por fuente">
                    <thead className="text-left text-xs text-muted-foreground">
                      <tr>
                        <th className="py-2 font-medium">Fuente</th>
                        <th className="font-medium">Archivos</th>
                        <th className="text-right font-medium">Registros</th>
                        <th className="text-right font-medium">Match</th>
                        <th className="pl-4 font-medium">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {datos.integridad.map((f) => (
                        <tr key={f.fuente} className="border-t border-border">
                          <td className="py-2.5">
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
                            <Chip tono={INTEGRIDAD[f.estado].tono}>
                              {INTEGRIDAD[f.estado].texto}
                            </Chip>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>

              <Panel titulo="Alertas abiertas" subtitulo="Por tipo, con severidad máxima">
                {datos.alertasAbiertas.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin alertas abiertas.</p>
                ) : (
                  <ul className="space-y-1">
                    {datos.alertasAbiertas.map((g) => (
                      <li key={g.grupo}>
                        <button
                          type="button"
                          onClick={() =>
                            void navigate({ to: "/alertas", search: { grupo: g.grupo } })
                          }
                          className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted"
                        >
                          <span className="truncate">{g.grupo}</span>
                          <span className="flex items-center gap-2">
                            <Chip tono={TONO_SEVERIDAD[g.severidadMaxima]}>
                              {ETIQUETAS_SEVERIDAD[g.severidadMaxima]}
                            </Chip>
                            <span className="numeric w-6 text-right font-semibold">{g.conteo}</span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            </div>
          </div>
        )}
      </EstadoConsulta>
    </AppShell>
  );
}
