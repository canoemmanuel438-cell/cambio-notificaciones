import { Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { claveSla } from "@/domain/entities/Indicador";
import { ETIQUETAS_ESTADO_SLA } from "@/domain/entities/ProcesoSLA";
import {
  META_CUMPLIMIENTO_SLA,
  type FilaProcesoSLA,
} from "@/application/useCases/dashboard/ObtenerDashboardSLAUseCase";
import { EstadoConsulta } from "@/presentation/components/estado-consulta/EstadoConsulta";
import { Chip, KpiCard, Panel } from "@/presentation/components/ui-monitor/Monitor";
import { TONO_SLA } from "@/presentation/components/ui-monitor/tonos";
import { AppShell } from "@/presentation/layouts/AppShell";
import { useDashboardSLA } from "@/presentation/hooks/useMonitor";
import { cn } from "@/lib/utils";
import {
  formatearDia,
  formatearDiaCorto,
  formatearMinutos,
  minutosAHora,
} from "@/shared/utils/formato";

const EJE_INICIO = 5 * 60;
const EJE_FIN = 11 * 60;
const pos = (min: number) =>
  `${((Math.min(Math.max(min, EJE_INICIO), EJE_FIN) - EJE_INICIO) / (EJE_FIN - EJE_INICIO)) * 100}%`;
const BARRA: Record<string, string> = {
  EN_TIEMPO: "bg-verde",
  EN_RIESGO: "bg-serie-2",
  INCUMPLIDO: "bg-rojo",
  SIN_RECIBIR: "bg-rojo",
  PROGRAMADO: "bg-pendiente",
};

function FilaGantt({
  fila,
  ahoraMin,
  esHoy,
}: {
  fila: FilaProcesoSLA;
  ahoraMin: number;
  esHoy: boolean;
}) {
  const { ejecucion: e, estado } = fila;
  const limite =
    e.proceso.tipo === "DURACION"
      ? (e.inicioMin ?? e.programadoMin) + e.proceso.limiteMin
      : e.proceso.limiteMin;
  const inicio =
    e.proceso.tipo === "DURACION"
      ? e.inicioMin
      : e.llegadaMin !== undefined
        ? e.llegadaMin - 12
        : undefined;
  const fin = e.proceso.tipo === "DURACION" ? e.finMin : e.llegadaMin;
  const esperaFuera =
    e.proceso.tipo === "HORA_LIMITE" && (e.llegadaMin ?? (esHoy ? ahoraMin : limite)) > limite;
  const finEspera = e.llegadaMin ?? ahoraMin;
  return (
    <div className="grid grid-cols-[180px_1fr] items-center gap-3 py-1.5 text-xs">
      <Link
        to="/detalle/$clave"
        params={{ clave: claveSla(e.proceso.id, e.fecha) }}
        className="truncate text-primary underline-offset-2 hover:underline"
        title="Ver las operaciones que procesa este proceso"
      >
        {e.proceso.nombre}
      </Link>
      <div
        className="relative h-5 rounded bg-muted"
        aria-label={`${e.proceso.nombre}: ${ETIQUETAS_ESTADO_SLA[estado]}`}
        role="img"
      >
        {inicio !== undefined && fin !== undefined && (
          <span
            className={cn("absolute top-1 h-3 rounded", BARRA[estado])}
            style={{ left: pos(inicio), width: `calc(${pos(fin)} - ${pos(inicio)} + 3px)` }}
          />
        )}
        {esperaFuera && (
          <span
            className="absolute top-1/2 border-t-2 border-dashed border-rojo"
            style={{ left: pos(limite), width: `calc(${pos(finEspera)} - ${pos(limite)})` }}
          />
        )}
        <span
          className="absolute -top-0.5 h-6 w-0.5 bg-foreground"
          style={{ left: pos(limite) }}
          title={`Límite SLA ${minutosAHora(limite)}`}
        />
      </div>
    </div>
  );
}

/** `fechaInicial`: día a mostrar al llegar (p. ej. al volver desde el detalle de un proceso). */
export function DashboardSLAPage({ fechaInicial }: { fechaInicial?: string | undefined }) {
  const [fecha, setFecha] = useState<string | undefined>(fechaInicial);
  const { datos, cargando, error } = useDashboardSLA(fecha);

  return (
    <AppShell
      pantalla="SLA"
      titulo="Dashboard de SLA"
      subtitulo="Tiempos de procesamiento y entrega, desviaciones e incumplimientos"
    >
      <EstadoConsulta cargando={cargando} error={error}>
        {datos && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
              <KpiCard
                titulo="Procesos en tiempo"
                valor={String(datos.kpis.enTiempo)}
                nota={formatearDia(datos.fechaSeleccionada)}
              />
              <KpiCard
                titulo="En riesgo"
                valor={String(datos.kpis.enRiesgo)}
                nota="p95 mayor al 85% del SLA"
              />
              <KpiCard
                titulo="Incumplidos"
                valor={String(datos.kpis.incumplidos)}
                tendencia={
                  datos.kpis.incumplidos ? { direccion: "arriba", positiva: false } : undefined
                }
              />
              <KpiCard
                titulo="Retraso acumulado"
                valor={formatearMinutos(datos.kpis.retrasoAcumuladoMin)}
                nota="Fuera de SLA"
              />
            </div>

            <Panel
              titulo="Cumplimiento diario"
              subtitulo={`Últimos 14 días · meta ${META_CUMPLIMIENTO_SLA}% · toca un día para ver su detalle`}
            >
              <div className="h-56" role="img" aria-label="Cumplimiento diario de SLA">
                <ResponsiveContainer>
                  <BarChart
                    data={datos.cumplimientoDiario}
                    margin={{ left: -20, right: 8, top: 8 }}
                  >
                    <CartesianGrid stroke="var(--border)" vertical={false} />
                    <XAxis
                      dataKey="fecha"
                      tickFormatter={formatearDiaCorto}
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    />
                    <YAxis
                      domain={[50, 100]}
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      unit="%"
                    />
                    <Tooltip
                      labelFormatter={(v) => formatearDia(String(v))}
                      formatter={(v) => [`${Number(v).toFixed(1)}%`, "En tiempo"]}
                      contentStyle={{
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        fontSize: 12,
                      }}
                    />
                    <ReferenceLine
                      y={META_CUMPLIMIENTO_SLA}
                      stroke="var(--rojo)"
                      strokeDasharray="4 4"
                    />
                    <Bar
                      dataKey="porcentaje"
                      radius={[3, 3, 0, 0]}
                      onClick={(d: { fecha?: string }) => d.fecha && setFecha(d.fecha)}
                      className="cursor-pointer"
                    >
                      {datos.cumplimientoDiario.map((d) => (
                        <Cell
                          key={d.fecha}
                          fill={
                            d.fecha === datos.fechaSeleccionada
                              ? "var(--primary)"
                              : "var(--accent-foreground)"
                          }
                          fillOpacity={d.fecha === datos.fechaSeleccionada ? 1 : 0.45}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            <Panel
              titulo={`Ejecución del día contra SLA · ${formatearDia(datos.fechaSeleccionada)}`}
              subtitulo="Toca un proceso para ver las operaciones que procesa"
            >
              <ul
                className="mb-3 flex flex-wrap gap-4 text-xs text-muted-foreground"
                aria-label="Leyenda"
              >
                <li className="flex items-center gap-1.5">
                  <span className="h-2.5 w-4 rounded bg-verde" />
                  En tiempo
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="h-2.5 w-4 rounded bg-serie-2" />
                  En riesgo
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="h-2.5 w-4 rounded bg-rojo" />
                  Incumplido
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="h-3 w-0.5 bg-foreground" />
                  Límite SLA
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="w-4 border-t-2 border-dashed border-rojo" />
                  Espera fuera de SLA
                </li>
              </ul>
              <div className="overflow-x-auto">
                <div className="min-w-[560px]">
                  <div className="grid grid-cols-[180px_1fr] gap-3 text-[11px] text-muted-foreground">
                    <span />
                    <div className="relative h-4">
                      {Array.from({ length: 7 }, (_, i) => EJE_INICIO + i * 60).map((m) => (
                        <span
                          key={m}
                          className="absolute -translate-x-1/2"
                          style={{ left: pos(m) }}
                        >
                          {minutosAHora(m)}
                        </span>
                      ))}
                    </div>
                  </div>
                  {datos.procesos.map((f) => (
                    <FilaGantt
                      key={f.ejecucion.proceso.id}
                      fila={f}
                      ahoraMin={datos.ahoraMin}
                      esHoy={datos.fechaSeleccionada === datos.fechaHoy}
                    />
                  ))}
                </div>
              </div>
            </Panel>

            <Panel titulo="Procesos y niveles de servicio">
              <div className="overflow-x-auto">
                <table className="w-full text-sm" aria-label="Procesos y niveles de servicio">
                  <thead className="text-left text-xs text-muted-foreground">
                    <tr>
                      <th className="py-2 font-medium">Proceso</th>
                      <th className="font-medium">Límite SLA</th>
                      <th className="font-medium">Programado</th>
                      <th className="font-medium">Real / p50</th>
                      <th className="font-medium">Desvío / p95</th>
                      <th className="font-medium">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {datos.procesos.map(({ ejecucion: e, estado, desvioMin }) => {
                      const duracion = e.proceso.tipo === "DURACION";
                      return (
                        <tr key={e.proceso.id} className="border-t border-border">
                          <td className="py-2.5">
                            <Link
                              to="/detalle/$clave"
                              params={{ clave: claveSla(e.proceso.id, e.fecha) }}
                              className="text-primary underline-offset-2 hover:underline"
                              title="Ver las operaciones que procesa este proceso"
                            >
                              {e.proceso.nombre}
                            </Link>
                          </td>
                          <td className="numeric">
                            {duracion
                              ? `${e.proceso.limiteMin} min`
                              : minutosAHora(e.proceso.limiteMin)}
                          </td>
                          <td className="numeric">{minutosAHora(e.programadoMin)}</td>
                          <td className="numeric">
                            {duracion
                              ? e.p50 !== undefined
                                ? `${e.p50} min`
                                : "—"
                              : e.llegadaMin !== undefined
                                ? minutosAHora(e.llegadaMin)
                                : "—"}
                          </td>
                          <td className="numeric">
                            {duracion
                              ? e.p95 !== undefined
                                ? `${e.p95} min`
                                : "—"
                              : desvioMin
                                ? `+${formatearMinutos(desvioMin)}`
                                : "—"}
                          </td>
                          <td>
                            <Chip tono={TONO_SLA[estado]}>{ETIQUETAS_ESTADO_SLA[estado]}</Chip>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Valores SLA de ejemplo, parametrizables.
              </p>
            </Panel>
          </div>
        )}
      </EstadoConsulta>
    </AppShell>
  );
}
