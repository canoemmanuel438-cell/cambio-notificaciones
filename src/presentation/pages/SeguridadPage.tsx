import { ShieldCheck } from "lucide-react";

import { EstadoConsulta } from "@/presentation/components/estado-consulta/EstadoConsulta";
import { Chip, KpiCard, Panel } from "@/presentation/components/ui-monitor/Monitor";
import { AppShell } from "@/presentation/layouts/AppShell";
import { usePosturaSeguridad } from "@/presentation/hooks/useMonitor";

export function SeguridadPage() {
  const { datos, cargando, error } = usePosturaSeguridad();
  return (
    <AppShell
      pantalla="SEGURIDAD"
      titulo="Seguridad"
      subtitulo="Protección de datos, autenticación y segregación de ambientes"
    >
      <EstadoConsulta cargando={cargando} error={error}>
        {datos && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              <KpiCard
                acento="verde"
                titulo="Controles activos"
                valor={`${datos.activos} / ${datos.controles.length}`}
              />
              <KpiCard
                titulo="Autenticación"
                valor={datos.autenticacion.proveedor}
                nota={datos.autenticacion.protocolo}
              />
              <KpiCard
                acento="turquesa"
                titulo="Ambientes segregados"
                valor={String(datos.ambientes.length)}
              />
            </div>
            <div className="grid gap-5 xl:grid-cols-[3fr_2fr]">
              <Panel titulo="Controles de seguridad">
                <ul className="divide-y divide-border">
                  {datos.controles.map((c) => (
                    <li key={c.control} className="flex items-start gap-3 py-3">
                      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-verde" aria-hidden />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{c.control}</p>
                        <p className="text-xs text-muted-foreground">{c.descripcion}</p>
                      </div>
                      <Chip tono="azul">{c.capa}</Chip>
                    </li>
                  ))}
                </ul>
              </Panel>
              <Panel
                titulo="Ambientes"
                subtitulo="Cada ambiente vive en un proyecto y una red separados"
              >
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="py-2 font-medium">Ambiente</th>
                      <th className="font-medium">Datos</th>
                      <th className="font-medium">Acceso</th>
                    </tr>
                  </thead>
                  <tbody>
                    {datos.ambientes.map((a) => (
                      <tr key={a.ambiente} className="border-t border-border align-top">
                        <td className="py-3 pr-3">
                          <p className="font-medium">{a.ambiente}</p>
                          <p className="numeric text-xs text-muted-foreground">{a.proyecto}</p>
                        </td>
                        <td className="pr-3">{a.datos}</td>
                        <td className="text-xs text-muted-foreground">{a.acceso}</td>
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
