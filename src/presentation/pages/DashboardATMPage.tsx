import { Link, useNavigate } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";

import { claveDia } from "@/domain/entities/Indicador";

import { ETIQUETAS_OPERACION_ATM } from "@/domain/entities/Transaccion";
import { EstadoConsulta } from "@/presentation/components/estado-consulta/EstadoConsulta";
import {
  FiltrosGlobalesBar,
  useFiltrosGlobales,
} from "@/presentation/components/filtros/FiltrosGlobalesBar";
import { AprobadasPorDia } from "@/presentation/components/graficas/AprobadasPorDia";
import { KpiCard, Panel } from "@/presentation/components/ui-monitor/Monitor";
import { AppShell } from "@/presentation/layouts/AppShell";
import { useDashboardATM } from "@/presentation/hooks/useMonitor";
import {
  formatearDia,
  formatearMoneda,
  formatearMonedaCompacta,
  formatearNumero,
  formatearPorcentaje,
} from "@/shared/utils/formato";

export function DashboardATMPage() {
  const filtros = useFiltrosGlobales();
  const { datos, cargando, error } = useDashboardATM(filtros);
  const navigate = useNavigate();

  return (
    <AppShell
      pantalla="ATM"
      titulo="Dashboard ATM"
      subtitulo="Operaciones de cajeros: TLF, SETL y conciliación contra STATS"
    >
      <FiltrosGlobalesBar />
      <EstadoConsulta cargando={cargando} error={error}>
        {datos && (
          <div className="space-y-6">
            {datos.setlFaltante && (
              <div
                role="alert"
                className="flex items-center gap-3 rounded-md border border-rojo/30 bg-rojo-suave p-4 text-sm text-rojo"
              >
                <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
                El archivo SETL con datos del {formatearDia(datos.setlFaltante)} no se ha recibido.
              </div>
            )}

            <Panel titulo="Resumen TLF">
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
                <KpiCard
                  detalle="atm-total"
                  titulo="Total de transacciones"
                  valor={formatearNumero(datos.resumenTLF.total)}
                />
                <KpiCard
                  detalle="atm-aprobadas"
                  titulo="Operaciones aprobadas"
                  valor={formatearNumero(datos.resumenTLF.aprobadas)}
                />
                <KpiCard
                  detalle="atm-rechazadas"
                  titulo="Operaciones rechazadas"
                  valor={formatearNumero(datos.resumenTLF.rechazadas)}
                />
                <KpiCard
                  detalle="atm-importe"
                  titulo="Importe aprobado"
                  valor={formatearMonedaCompacta(datos.resumenTLF.importeAprobado)}
                />
                <KpiCard
                  detalle="atm-retiros"
                  titulo="Retiros aprobados"
                  valor={formatearNumero(datos.resumenTLF.retirosAprobados)}
                />
                <KpiCard
                  detalle="atm-retiros"
                  titulo="Importe dispensado"
                  valor={formatearMonedaCompacta(datos.resumenTLF.importeDispensado)}
                />
              </div>
            </Panel>

            <div className="grid gap-6 xl:grid-cols-3">
              <Panel
                titulo="Aprobadas vs. rechazadas por día"
                subtitulo="Toca un día para ver sus operaciones"
                className="xl:col-span-2"
              >
                <AprobadasPorDia
                  datos={datos.porDia}
                  etiqueta="Operaciones ATM aprobadas y rechazadas por día"
                  onSeleccionarDia={(fecha) =>
                    void navigate({
                      to: "/detalle/$clave",
                      params: { clave: claveDia(fecha, "ATM") },
                    })
                  }
                />
              </Panel>
              <Panel titulo="Comparación TLF vs. STATS">
                <dl className="grid grid-cols-3 gap-3 text-center">
                  <Link
                    to="/detalle/$clave"
                    params={{ clave: "atm-match" }}
                    className="rounded-md bg-verde-suave p-3 text-verde hover:shadow-md"
                    title="Ver las operaciones con match"
                  >
                    <dt className="text-xs">Match</dt>
                    <dd className="text-xl font-semibold">
                      {formatearNumero(datos.comparacion.match)}
                    </dd>
                  </Link>
                  <Link
                    to="/detalle/$clave"
                    params={{ clave: "atm-sin-match" }}
                    className="rounded-md bg-rojo-suave p-3 text-rojo hover:shadow-md"
                    title="Ver las operaciones sin match"
                  >
                    <dt className="text-xs">Sin match</dt>
                    <dd className="text-xl font-semibold">
                      {formatearNumero(datos.comparacion.sinMatch)}
                    </dd>
                  </Link>
                  <div className="rounded-md bg-accent p-3 text-accent-foreground">
                    <dt className="text-xs">Tasa de match</dt>
                    <dd className="text-xl font-semibold">
                      {formatearPorcentaje(datos.comparacion.tasa)}
                    </dd>
                  </div>
                </dl>
              </Panel>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <Panel titulo="Resumen SETL" subtitulo="Últimos días con información">
                <table className="w-full text-sm" aria-label="Resumen SETL">
                  <thead className="text-left text-xs text-muted-foreground">
                    <tr>
                      <th className="py-2 font-medium">Fecha</th>
                      <th className="text-right font-medium">Operaciones</th>
                      <th className="text-right font-medium">Importe</th>
                    </tr>
                  </thead>
                  <tbody>
                    {datos.resumenSETL.ultimosDias.map((d) => (
                      <tr key={d.fecha} className="border-t border-border">
                        <td className="py-2">{formatearDia(d.fecha)}</td>
                        <td className="numeric text-right">{formatearNumero(d.conteo)}</td>
                        <td className="numeric text-right">{formatearMoneda(d.importe)}</td>
                      </tr>
                    ))}
                    <tr className="border-t border-border font-semibold">
                      <td className="py-2">
                        <Link
                          to="/detalle/$clave"
                          params={{ clave: "atm-liquidadas" }}
                          className="text-primary underline-offset-2 hover:underline"
                          title="Ver las operaciones liquidadas"
                        >
                          Acumulado del periodo
                        </Link>
                      </td>
                      <td className="numeric text-right">
                        {formatearNumero(datos.resumenSETL.conteo)}
                      </td>
                      <td className="numeric text-right">
                        {formatearMonedaCompacta(datos.resumenSETL.importe)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </Panel>
              <Panel titulo="Tipos de operación ATM">
                <table className="w-full text-sm" aria-label="Tipos de operación ATM">
                  <thead className="text-left text-xs text-muted-foreground">
                    <tr>
                      <th className="py-2 font-medium">Operación</th>
                      <th className="text-right font-medium">Aprobadas</th>
                      <th className="text-right font-medium">Rechazadas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {datos.tipos.map((t) => (
                      <tr key={t.operacion} className="border-t border-border">
                        <td className="py-2">{ETIQUETAS_OPERACION_ATM[t.operacion]}</td>
                        <td className="numeric text-right">{formatearNumero(t.aprobadas)}</td>
                        <td className="numeric text-right">{formatearNumero(t.rechazadas)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Panel>
            </div>
          </div>
        )}
      </EstadoConsulta>
    </AppShell>
  );
}
