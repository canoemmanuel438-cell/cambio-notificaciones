import { Link, useNavigate } from "@tanstack/react-router";

import { claveDia } from "@/domain/entities/Indicador";
import { ETIQUETAS_CIRCUITO } from "@/domain/entities/Transaccion";
import { EstadoConsulta } from "@/presentation/components/estado-consulta/EstadoConsulta";
import {
  FiltrosGlobalesBar,
  useFiltrosGlobales,
} from "@/presentation/components/filtros/FiltrosGlobalesBar";
import { AprobadasPorDia } from "@/presentation/components/graficas/AprobadasPorDia";
import { BarrasHorizontales, KpiCard, Panel } from "@/presentation/components/ui-monitor/Monitor";
import { AppShell } from "@/presentation/layouts/AppShell";
import { useDashboardPOS } from "@/presentation/hooks/useMonitor";
import { useFiltrosGlobalesStore } from "@/presentation/stores/filtrosGlobalesStore";
import { formatearMoneda, formatearMonedaCompacta, formatearNumero } from "@/shared/utils/formato";

const enlace = "numeric font-medium text-primary underline-offset-2 hover:underline";

function Etapa({
  titulo,
  completadas,
  pendientes,
  etiquetaPendiente,
  detalleCompletadas,
  detallePendientes,
}: {
  titulo: string;
  completadas: number;
  pendientes: number;
  etiquetaPendiente: string;
  detalleCompletadas: string;
  detallePendientes: string;
}) {
  return (
    <div className="rounded-md border border-border p-3">
      <p className="text-xs text-muted-foreground">{titulo}</p>
      <Link
        to="/detalle/$clave"
        params={{ clave: detalleCompletadas }}
        className="mt-1 block text-xl font-semibold hover:text-primary"
        title="Ver las operaciones completadas"
      >
        {formatearNumero(completadas)}
      </Link>
      <p className="text-xs text-muted-foreground">completadas</p>
      <p className="mt-2 text-xs">
        <Link
          to="/detalle/$clave"
          params={{ clave: detallePendientes }}
          className={enlace}
          title="Ver las operaciones pendientes"
        >
          {formatearNumero(pendientes)}
        </Link>{" "}
        {etiquetaPendiente}
      </p>
    </div>
  );
}

export function DashboardPOSPage() {
  const filtros = useFiltrosGlobales(true);
  const { circuito, actualizar } = useFiltrosGlobalesStore();
  const { datos, cargando, error } = useDashboardPOS(filtros);
  const navigate = useNavigate();

  return (
    <AppShell pantalla="POS" titulo="Dashboard POS" subtitulo="Monitoreo del circuito POS">
      <FiltrosGlobalesBar incluirPOS />
      <EstadoConsulta cargando={cargando} error={error}>
        {datos && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-9">
              <KpiCard
                detalle="pos-autorizadas"
                titulo="Autorizadas"
                valor={formatearNumero(datos.kpis.autorizadas)}
              />
              <KpiCard
                detalle="pos-rechazadas"
                titulo="Rechazadas"
                valor={formatearNumero(datos.kpis.rechazadas)}
              />
              <KpiCard
                detalle="pos-autorizadas"
                titulo="Ticket promedio"
                valor={formatearMoneda(datos.kpis.ticketPromedio)}
              />
              <KpiCard
                detalle="pos-completadas"
                titulo="Completadas"
                valor={formatearNumero(datos.kpis.completadas)}
                nota="Ciclo completo"
              />
              <KpiCard
                detalle="pos-pendientes"
                titulo="Pendientes"
                valor={formatearNumero(datos.kpis.pendientes)}
                nota="En plazo"
              />
              <KpiCard
                detalle="pos-incidencias"
                titulo="Con incidencia"
                valor={formatearNumero(datos.kpis.conIncidencia)}
                tendencia={{ direccion: "arriba", positiva: false }}
              />
              <KpiCard
                detalle="pos-no-compensadas"
                titulo="Importe pendiente"
                valor={formatearMonedaCompacta(datos.kpis.importePendiente)}
                nota="Sin compensar"
              />
              <KpiCard
                detalle="pos-dc01"
                titulo="Recibidas con DC01"
                valor={formatearNumero(datos.kpis.dcDelDia.dc01)}
                nota={`Del día ${datos.kpis.dcDelDia.fecha}`}
              />
              <KpiCard
                detalle="pos-dc00"
                titulo="Recibidas con DC00"
                valor={formatearNumero(datos.kpis.dcDelDia.dc00)}
                nota={`Del día ${datos.kpis.dcDelDia.fecha}`}
              />
            </div>

            <div className="grid gap-6 xl:grid-cols-3">
              <Panel
                titulo="Autorizadas vs. rechazadas por día"
                subtitulo="Toca un día para ver sus operaciones"
                className="xl:col-span-2"
              >
                <AprobadasPorDia
                  datos={datos.porDia}
                  etiqueta="Transacciones POS autorizadas y rechazadas por día"
                  onSeleccionarDia={(fecha) =>
                    void navigate({
                      to: "/detalle/$clave",
                      params: { clave: claveDia(fecha, "POS") },
                    })
                  }
                />
              </Panel>
              <Panel titulo="Motivos de rechazo">
                {datos.motivos.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin rechazos en el periodo.</p>
                ) : (
                  <BarrasHorizontales
                    etiqueta="Motivos de rechazo"
                    datos={datos.motivos.map((m) => ({
                      clave: m.codigo,
                      etiqueta: `${m.codigo} · ${m.descripcion}`,
                      valor: m.conteo,
                    }))}
                  />
                )}
              </Panel>
            </div>

            <div className="grid gap-6 xl:grid-cols-3">
              <Panel titulo="Distribución por circuito" subtitulo="Toca un circuito para filtrar">
                <BarrasHorizontales
                  etiqueta="Distribución por circuito"
                  seleccionado={circuito || undefined}
                  onSeleccionar={(c) => actualizar({ circuito: circuito === c ? "" : c })}
                  datos={datos.circuitos.map((c) => ({
                    clave: c.circuito,
                    etiqueta: ETIQUETAS_CIRCUITO[c.circuito],
                    valor: c.conteo,
                  }))}
                />
              </Panel>
              <Panel titulo="Etapas del circuito" className="xl:col-span-2">
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <Etapa
                    titulo="Compensación"
                    {...datos.etapas.compensacion}
                    etiquetaPendiente="pendientes"
                    detalleCompletadas="pos-comp-completada"
                    detallePendientes="pos-comp-pendiente"
                  />
                  <Etapa
                    titulo="Posteo"
                    {...datos.etapas.posteo}
                    etiquetaPendiente="Posteo pendiente"
                    detalleCompletadas="pos-posteo-completado"
                    detallePendientes="pos-posteo-pendiente"
                  />
                  <Etapa
                    titulo="Depósito"
                    {...datos.etapas.deposito}
                    etiquetaPendiente="Depósito pendiente"
                    detalleCompletadas="pos-deposito-completado"
                    detallePendientes="pos-deposito-pendiente"
                  />
                  <div className="rounded-md border border-border p-3">
                    <p className="text-xs text-muted-foreground">Aclaración</p>
                    <Link
                      to="/detalle/$clave"
                      params={{ clave: "pos-aclaracion-abierta" }}
                      className="mt-1 block text-xl font-semibold hover:text-primary"
                      title="Ver las aclaraciones abiertas"
                    >
                      {formatearNumero(datos.etapas.aclaracion.abiertas)}
                    </Link>
                    <p className="text-xs text-muted-foreground">abiertas</p>
                    <p className="mt-2 text-xs">
                      <Link
                        to="/detalle/$clave"
                        params={{ clave: "pos-aclaracion-resuelta" }}
                        className={enlace}
                        title="Ver las aclaraciones resueltas"
                      >
                        {formatearNumero(datos.etapas.aclaracion.resueltas)}
                      </Link>{" "}
                      resueltas
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-baseline gap-x-6 gap-y-1 rounded-md bg-muted p-3 text-sm">
                  <Link
                    to="/detalle/$clave"
                    params={{ clave: "pos-no-compensadas" }}
                    className="font-medium text-primary underline-offset-2 hover:underline"
                  >
                    Valores no compensados
                  </Link>
                  <span>
                    <span className="numeric font-semibold">
                      {formatearNumero(datos.noCompensados.conteo)}
                    </span>{" "}
                    transacciones
                  </span>
                  <span>
                    Importe pendiente{" "}
                    <span className="numeric font-semibold">
                      {formatearMoneda(datos.noCompensados.importe)}
                    </span>
                  </span>
                </div>
              </Panel>
            </div>
          </div>
        )}
      </EstadoConsulta>
    </AppShell>
  );
}
