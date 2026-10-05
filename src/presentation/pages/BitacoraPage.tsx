import { buscarRol } from "@/domain/entities/Rol";
import { DataTable } from "@/presentation/components/data-table/DataTable";
import { EstadoConsulta } from "@/presentation/components/estado-consulta/EstadoConsulta";
import { Paginador, Panel } from "@/presentation/components/ui-monitor/Monitor";
import { AppShell } from "@/presentation/layouts/AppShell";
import { useBitacora, usePaginacion } from "@/presentation/hooks/useMonitor";
import { formatearFechaSegundos } from "@/shared/utils/formato";

export function BitacoraPage() {
  const { datos, cargando, error } = useBitacora();
  const pag = usePaginacion(datos ?? [], 20);
  return (
    <AppShell
      pantalla="BITACORA"
      titulo="Bitácora"
      subtitulo="Accesos, búsquedas, descargas y cambios de estado registrados en esta sesión"
    >
      <Panel subtitulo="En producción se almacena en Cloud Logging" titulo="Eventos">
        <EstadoConsulta
          cargando={cargando}
          error={error}
          vacio={(datos?.length ?? 0) === 0}
          mensajeVacio="Aún no hay eventos."
        >
          <DataTable
            etiqueta="Bitácora"
            filas={pag.visibles}
            claveDe={(e) => e.id}
            columnas={[
              {
                clave: "fecha",
                encabezado: "Fecha / hora",
                render: (e) => <span className="numeric">{formatearFechaSegundos(e.fecha)}</span>,
              },
              { clave: "rol", encabezado: "Rol", render: (e) => buscarRol(e.rol)?.nombre ?? e.rol },
              { clave: "evento", encabezado: "Evento", render: (e) => e.evento },
              {
                clave: "detalle",
                encabezado: "Detalle",
                render: (e) => <span className="text-muted-foreground">{e.detalle}</span>,
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
    </AppShell>
  );
}
