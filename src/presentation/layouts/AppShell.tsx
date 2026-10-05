import { Link, useNavigate } from "@tanstack/react-router";
import {
  Activity,
  ArrowLeftRight,
  Bell,
  CircleHelp,
  CreditCard,
  FileBarChart,
  FileWarning,
  Layers,
  LayoutDashboard,
  LayoutTemplate,
  LogOut,
  Monitor,
  ScrollText,
  Search,
  Settings,
  ShieldCheck,
  Timer,
  UserCog,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { puedeVerPantalla, type Pantalla } from "@/domain/entities/Rol";
import { cn } from "@/lib/utils";
import { LogoVisor } from "@/presentation/components/marca/LogoVisor";
import { SelectorRol } from "@/presentation/components/sesion/SelectorRol";
import {
  useAccionesSesion,
  useAlertas,
  useRegistrarNavegacion,
  useSesion,
} from "@/presentation/hooks/useMonitor";

type Grupo = "Menú principal" | "Monitoreo" | "Administración";

export const NAVEGACION: {
  pantalla: Pantalla;
  to: string;
  etiqueta: string;
  icono: typeof Activity;
  grupo: Grupo;
}[] = [
  {
    pantalla: "EJECUTIVO",
    to: "/",
    etiqueta: "Dashboard",
    icono: LayoutDashboard,
    grupo: "Menú principal",
  },
  {
    pantalla: "TRAZABILIDAD",
    to: "/trazabilidad",
    etiqueta: "Búsqueda",
    icono: Search,
    grupo: "Menú principal",
  },
  {
    pantalla: "MATCH",
    to: "/match",
    etiqueta: "Match",
    icono: ArrowLeftRight,
    grupo: "Menú principal",
  },
  {
    pantalla: "REPORTES",
    to: "/reportes",
    etiqueta: "Reportes",
    icono: FileBarChart,
    grupo: "Menú principal",
  },
  { pantalla: "POS", to: "/pos", etiqueta: "Dashboard POS", icono: CreditCard, grupo: "Monitoreo" },
  { pantalla: "ATM", to: "/atm", etiqueta: "Dashboard ATM", icono: Monitor, grupo: "Monitoreo" },
  { pantalla: "SLA", to: "/sla", etiqueta: "SLA", icono: Timer, grupo: "Monitoreo" },
  { pantalla: "ALERTAS", to: "/alertas", etiqueta: "Alertas", icono: Bell, grupo: "Monitoreo" },
  {
    pantalla: "NO_MATCH",
    to: "/no-match",
    etiqueta: "Reporte No Match",
    icono: FileWarning,
    grupo: "Monitoreo",
  },
  {
    pantalla: "LAYOUTS",
    to: "/layouts",
    etiqueta: "Web Manager de layouts",
    icono: LayoutTemplate,
    grupo: "Administración",
  },
  {
    pantalla: "MODELO_SEMANTICO",
    to: "/modelo-semantico",
    etiqueta: "Modelo semántico",
    icono: Layers,
    grupo: "Administración",
  },
  {
    pantalla: "SEGURIDAD",
    to: "/seguridad",
    etiqueta: "Seguridad",
    icono: ShieldCheck,
    grupo: "Administración",
  },
  {
    pantalla: "BITACORA",
    to: "/bitacora",
    etiqueta: "Bitácora",
    icono: ScrollText,
    grupo: "Administración",
  },
  {
    pantalla: "CONFIGURACION",
    to: "/configuracion",
    etiqueta: "Configuración",
    icono: Settings,
    grupo: "Administración",
  },
];

const GRUPOS: Grupo[] = ["Menú principal", "Monitoreo", "Administración"];

function BadgeAlertas() {
  const { datos } = useAlertas({ estado: "ABIERTA" });
  const n = datos?.kpis.abiertas ?? 0;
  if (!n) return null;
  return (
    <span
      className="ml-auto rounded-full bg-rojo-solido px-1.5 text-[11px] font-semibold text-destructive-foreground"
      aria-label={`${n} alertas abiertas`}
    >
      {n}
    </span>
  );
}

export function AppShell({
  pantalla,
  titulo,
  subtitulo,
  acciones,
  children,
}: {
  pantalla: Pantalla | "AYUDA";
  titulo: string;
  subtitulo: string;
  acciones?: ReactNode;
  children: ReactNode;
}) {
  const { rol, cargando } = useSesion();
  const { iniciar, cerrar } = useAccionesSesion();
  const navigate = useNavigate();
  const [cambiando, setCambiando] = useState(false);
  useRegistrarNavegacion(
    pantalla === "AYUDA" ? "EJECUTIVO" : pantalla,
    pantalla === "AYUDA" ? undefined : rol?.id,
  );

  useEffect(() => {
    if (!cargando && !rol) void navigate({ to: "/login" });
  }, [cargando, rol, navigate]);

  if (cargando || !rol) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Cargando…
      </div>
    );
  }

  const visibles = NAVEGACION.filter((n) => puedeVerPantalla(rol, n.pantalla));
  const permitida = pantalla === "AYUDA" || puedeVerPantalla(rol, pantalla);
  const pestanas = [
    {
      to: "/",
      etiqueta: "Dashboard",
      icono: LayoutDashboard,
      activa: pantalla === "EJECUTIVO",
      ver: puedeVerPantalla(rol, "EJECUTIVO"),
    },
    {
      to: "/configuracion",
      etiqueta: "Configuración",
      icono: Settings,
      activa: pantalla === "CONFIGURACION",
      ver: puedeVerPantalla(rol, "CONFIGURACION"),
    },
    { to: "/ayuda", etiqueta: "Ayuda", icono: CircleHelp, activa: pantalla === "AYUDA", ver: true },
  ].filter((p) => p.ver);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 flex h-[60px] items-center border-b border-border bg-card pl-4 pr-3 lg:pl-5">
        <Link to="/" className="flex items-center gap-2.5">
          <LogoVisor className="h-9 w-9" />
          <span className="leading-tight">
            <span className="block text-base font-bold text-navy">Visor PET</span>
            <span className="hidden text-xs text-muted-foreground sm:block">
              Trazabilidad y conciliación transaccional
            </span>
          </span>
        </Link>
        <nav aria-label="Accesos rápidos" className="ml-auto hidden h-full md:flex">
          {pestanas.map(({ to, etiqueta, icono: Icono, activa }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex h-full items-center gap-2 border-b-[3px] border-transparent px-4 text-sm text-muted-foreground transition-colors hover:text-foreground",
                activa && "border-primary bg-accent text-accent-foreground",
              )}
            >
              <Icono className="h-4 w-4" aria-hidden />
              {etiqueta}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2 border-l border-border pl-4 md:ml-4">
          <span
            className="grid h-9 w-9 place-items-center rounded-full bg-navy text-xs font-bold text-primary-foreground"
            aria-hidden
          >
            {rol.nombre.slice(0, 2).toUpperCase()}
          </span>
          <div className="hidden leading-tight sm:block">
            <p className="text-sm font-medium">Usuario demo</p>
            <p className="text-[11px] text-muted-foreground">{rol.nombre} · PingOne</p>
          </div>
          <button
            type="button"
            onClick={() => setCambiando(true)}
            className="rounded-md p-2 text-muted-foreground hover:bg-muted"
            title="Cambiar rol"
            aria-label="Cambiar rol"
          >
            <UserCog className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={async () => {
              await cerrar();
              void navigate({ to: "/login" });
            }}
            className="rounded-md p-2 text-muted-foreground hover:bg-muted"
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="flex flex-1">
        <aside className="sticky top-[60px] h-[calc(100vh-60px)] w-16 shrink-0 overflow-y-auto border-r border-sidebar-border bg-sidebar py-4 text-sidebar-foreground lg:w-[232px]">
          {GRUPOS.map((g) => {
            const items = visibles.filter((n) => n.grupo === g);
            if (!items.length) return null;
            return (
              <nav key={g} aria-label={g} className="mb-4 px-2 lg:px-3">
                <p className="mb-1 hidden px-3 text-xs font-medium text-sidebar-tenue lg:block">
                  {g}
                </p>
                {items.map(({ to, etiqueta, icono: Icono, pantalla: p }) => (
                  <Link
                    key={to}
                    to={to}
                    title={etiqueta}
                    className={cn(
                      "my-0.5 flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      p === pantalla &&
                        "bg-sidebar-activo font-medium text-primary-foreground hover:bg-sidebar-activo hover:text-primary-foreground",
                    )}
                  >
                    <Icono className="h-4 w-4 shrink-0" aria-hidden />
                    <span className="hidden lg:inline">{etiqueta}</span>
                    {p === "ALERTAS" && (
                      <span className="hidden lg:contents">
                        <BadgeAlertas />
                      </span>
                    )}
                  </Link>
                ))}
              </nav>
            );
          })}
        </aside>

        <main className="min-w-0 flex-1 px-4 py-6 md:px-7">
          <header className="banner mb-5 flex flex-wrap items-center justify-between gap-4 px-6 py-5 shadow-sm">
            <div>
              <h1 className="text-xl font-bold tracking-tight md:text-2xl">{titulo}</h1>
              <p className="mt-1 text-sm opacity-85">{subtitulo}</p>
            </div>
            {permitida && acciones && (
              <div className="flex flex-wrap gap-2 [&_button]:border-transparent">{acciones}</div>
            )}
          </header>
          {permitida ? (
            children
          ) : (
            <div className="panel p-10 text-center text-sm text-muted-foreground">
              Tu rol no tiene acceso a esta pantalla.
            </div>
          )}
        </main>
      </div>

      <Dialog open={cambiando} onOpenChange={setCambiando}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar de rol</DialogTitle>
            <DialogDescription>
              Verás solo las funciones que ese rol tiene permitidas.
            </DialogDescription>
          </DialogHeader>
          <SelectorRol
            inicial={rol.id}
            textoBoton="Cambiar rol"
            onConfirmar={async (nuevo) => {
              const r = await iniciar(nuevo);
              setCambiando(false);
              const destino = NAVEGACION.find((n) => puedeVerPantalla(r, n.pantalla));
              if (pantalla !== "AYUDA" && !puedeVerPantalla(r, pantalla) && destino)
                void navigate({ to: destino.to });
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
