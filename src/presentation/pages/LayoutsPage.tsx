import { useState } from "react";

import { Input } from "@/components/ui/input";
import type { CanalLayout } from "@/domain/entities/Administracion";
import { EstadoConsulta } from "@/presentation/components/estado-consulta/EstadoConsulta";
import { Chip, KpiCard, Panel, Segmentado } from "@/presentation/components/ui-monitor/Monitor";
import { AppShell } from "@/presentation/layouts/AppShell";
import { useLayouts } from "@/presentation/hooks/useMonitor";

type FiltroCanal = "TODOS" | CanalLayout;

export function LayoutsPage() {
  const [texto, setTexto] = useState("");
  const [canal, setCanal] = useState<FiltroCanal>("TODOS");
  const { datos, cargando, error } = useLayouts({
    texto,
    canal: canal === "TODOS" ? undefined : canal,
  });

  return (
    <AppShell
      pantalla="LAYOUTS"
      titulo="Web Manager de layouts"
      subtitulo="Layouts de ingesta por fuente, canal y FIID"
    >
      <EstadoConsulta cargando={cargando} error={error}>
        {datos && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <KpiCard titulo="Layouts registrados" valor={String(datos.resumen.total)} />
              <KpiCard
                acento="verde"
                titulo="Activos"
                valor={String(datos.resumen.activos)}
                nota={`${datos.resumen.inactivos} inactivos`}
              />
              <KpiCard
                acento="turquesa"
                titulo="FIIDs configurados"
                valor={String(datos.resumen.fiids)}
              />
              <KpiCard
                acento="naranja"
                titulo="Cambios en 30 días"
                valor={String(datos.resumen.cambios30Dias)}
              />
            </div>
            <Panel
              titulo="Catálogo de layouts"
              acciones={
                <div className="flex flex-wrap gap-2">
                  <Input
                    value={texto}
                    onChange={(e) => setTexto(e.target.value)}
                    placeholder="Buscar por nombre, fuente o FIID"
                    className="h-9 w-64 bg-card"
                    aria-label="Buscar layout"
                  />
                  <Segmentado<FiltroCanal>
                    etiqueta="Canal"
                    valor={canal}
                    onCambiar={setCanal}
                    opciones={[
                      { valor: "TODOS", etiqueta: "Todos" },
                      { valor: "POS", etiqueta: "POS" },
                      { valor: "ATM", etiqueta: "ATM" },
                    ]}
                  />
                </div>
              }
            >
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="py-2 font-medium">ID</th>
                      <th className="font-medium">Nombre</th>
                      <th className="font-medium">Fuente</th>
                      <th className="font-medium">Canal</th>
                      <th className="text-right font-medium">Versión</th>
                      <th className="text-right font-medium">Campos</th>
                      <th className="pl-4 font-medium">FIIDs</th>
                      <th className="font-medium">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {datos.layouts.map((l) => (
                      <tr key={l.id} className="border-t border-border">
                        <td className="numeric py-3 text-primary">{l.id}</td>
                        <td>{l.nombre}</td>
                        <td className="numeric">{l.fuente}</td>
                        <td>{l.canal}</td>
                        <td className="numeric text-right">v{l.version}</td>
                        <td className="numeric text-right">{l.campos}</td>
                        <td className="numeric pl-4 text-xs text-muted-foreground">
                          {l.fiids.join(", ")}
                        </td>
                        <td>
                          <Chip tono={l.activo ? "verde" : "gris"}>
                            {l.activo ? "Activo" : "Inactivo"}
                          </Chip>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!datos.layouts.length && (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    Ningún layout coincide con la búsqueda.
                  </p>
                )}
              </div>
            </Panel>
          </div>
        )}
      </EstadoConsulta>
    </AppShell>
  );
}
