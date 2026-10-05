import { AlertTriangle, Inbox, Loader2 } from "lucide-react";

import type { ReactNode } from "react";

/**
 * Estados visibles de una consulta: cargando / error seguro / vacío.
 * No decide nada de negocio, solo presenta.
 */
export function EstadoConsulta({
  cargando,
  error,
  vacio,
  mensajeVacio = "No hay información para los filtros seleccionados.",
  children,
}: {
  cargando: boolean;
  error?: string | null | undefined;
  vacio?: boolean | undefined;
  mensajeVacio?: string | undefined;
  children: ReactNode;
}) {
  if (cargando) {
    return (
      <div
        className="flex items-center justify-center gap-3 rounded-xl border border-border bg-card/60 p-10 text-sm text-muted-foreground"
        role="status"
      >
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Cargando información…
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="flex items-center gap-3 rounded-xl border border-rojo/40 bg-rojo/10 p-6 text-sm text-rojo"
        role="alert"
      >
        <AlertTriangle className="h-4 w-4" aria-hidden />
        {error}
      </div>
    );
  }

  if (vacio) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
        <Inbox className="h-5 w-5" aria-hidden />
        {mensajeVacio}
      </div>
    );
  }

  return <>{children}</>;
}
