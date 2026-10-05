import { EstadoConsulta } from "@/presentation/components/estado-consulta/EstadoConsulta";
import { Chip, KpiCard, Panel } from "@/presentation/components/ui-monitor/Monitor";
import { AppShell } from "@/presentation/layouts/AppShell";
import { useModeloSemantico } from "@/presentation/hooks/useMonitor";
import { formatearFecha } from "@/shared/utils/formato";

export function ModeloSemanticoPage() {
  const { datos, cargando, error } = useModeloSemantico();
  return (
    <AppShell
      pantalla="MODELO_SEMANTICO"
      titulo="Modelo semántico"
      subtitulo="Cada métrica se define una sola vez y todas las pantallas la leen de aquí"
    >
      <EstadoConsulta cargando={cargando} error={error}>
        {datos && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <KpiCard
                acento="verde"
                titulo="Conexión"
                valor={datos.conexion.estado === "CONECTADA" ? "Conectada" : "Sin conexión"}
                nota={datos.conexion.destino}
              />
              <KpiCard titulo="Métricas definidas" valor={String(datos.metricas.length)} />
              <KpiCard
                acento="turquesa"
                titulo="Views y explores"
                valor={`${datos.views} · ${datos.explores}`}
              />
              <KpiCard
                acento="gris"
                titulo="Última actualización"
                valor={formatearFecha(datos.ultimaActualizacion)}
                nota={`${datos.vistasMaterializadas} vistas materializadas`}
              />
            </div>
            <Panel titulo="Diccionario de métricas">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="py-2 font-medium">Métrica</th>
                      <th className="font-medium">Definición</th>
                      <th className="font-medium">Tipo</th>
                      <th className="font-medium">View</th>
                      <th className="font-medium">Se usa en</th>
                    </tr>
                  </thead>
                  <tbody>
                    {datos.metricas.map((m) => (
                      <tr key={m.clave} className="border-t border-border align-top">
                        <td className="py-3 pr-4">
                          <p className="font-medium">{m.nombre}</p>
                          <p className="numeric text-xs text-muted-foreground">{m.clave}</p>
                        </td>
                        <td className="pr-4 text-muted-foreground">{m.definicion}</td>
                        <td className="pr-4">
                          <Chip tono="azul">{m.tipo}</Chip>
                        </td>
                        <td className="numeric pr-4 text-xs">{m.view}</td>
                        <td className="text-xs">{m.seUsaEn.join(", ")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          </div>
        )}
      </EstadoConsulta>
    </AppShell>
  );
}
