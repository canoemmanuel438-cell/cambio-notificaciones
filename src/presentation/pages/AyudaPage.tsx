import { Link } from "@tanstack/react-router";

import { puedeVerPantalla } from "@/domain/entities/Rol";
import { Panel } from "@/presentation/components/ui-monitor/Monitor";
import { AppShell, NAVEGACION } from "@/presentation/layouts/AppShell";
import { useSesion } from "@/presentation/hooks/useMonitor";

const GUIA: Record<string, string> = {
  "/": "Resumen del periodo: volumen, avance por etapa, integridad de archivos y alertas abiertas.",
  "/trazabilidad":
    "Encuentra una transacción por ID, PAN, referencia, monto o entidad y abre su ficha.",
  "/match": "Revisa el cruce entre autorización y compensación, filtrando por estatus.",
  "/reportes": "Integridad por fuente y resumen de conciliación del periodo.",
  "/pos": "Indicadores de terminales punto de venta: tipo de mensaje, circuito y motivos.",
  "/atm": "Indicadores de cajeros: disponibilidad, retiros y rechazos.",
  "/sla": "Línea de tiempo de los procesos del día contra su límite.",
  "/alertas": "Bandeja de alertas con seguimiento y cambio de estado.",
  "/no-match": "Operaciones sin conciliar por categoría, descargables en Excel.",
  "/layouts": "Catálogo de layouts de ingesta por fuente, canal y FIID.",
  "/modelo-semantico": "Definición única de cada métrica que usan las pantallas.",
  "/seguridad": "Controles de protección de datos y segregación de ambientes.",
  "/bitacora": "Registro de accesos, consultas, descargas y cambios.",
  "/configuracion": "Plazos, meta de match, umbrales de alerta y límites de SLA.",
};

export function AyudaPage() {
  const { rol } = useSesion();
  const visibles = rol ? NAVEGACION.filter((n) => puedeVerPantalla(rol, n.pantalla)) : [];
  return (
    <AppShell
      pantalla="AYUDA"
      titulo="Ayuda"
      subtitulo="Qué encuentras en cada pantalla disponible para tu rol"
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visibles.map(({ to, etiqueta, icono: Icono }) => (
          <Panel key={to}>
            <Link to={to} className="flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-accent text-accent-foreground">
                <Icono className="h-4 w-4" aria-hidden />
              </span>
              <span>
                <span className="block font-semibold">{etiqueta}</span>
                <span className="mt-1 block text-sm text-muted-foreground">{GUIA[to]}</span>
              </span>
            </Link>
          </Panel>
        ))}
      </div>
    </AppShell>
  );
}
