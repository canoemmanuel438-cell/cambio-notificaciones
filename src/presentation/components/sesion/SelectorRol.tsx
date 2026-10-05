import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ROL_PREDETERMINADO, ROLES, type RolId } from "@/domain/entities/Rol";
import { cn } from "@/lib/utils";

export function SelectorRol({
  inicial,
  textoBoton,
  onConfirmar,
}: {
  inicial: RolId;
  textoBoton: string;
  onConfirmar: (rol: RolId) => void | Promise<void>;
}) {
  const [rol, setRol] = useState<RolId>(inicial);
  const [enviando, setEnviando] = useState(false);
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setEnviando(true);
        try {
          await onConfirmar(rol);
        } finally {
          setEnviando(false);
        }
      }}
    >
      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-medium">Rol</legend>
        {ROLES.map((r) => (
          <label
            key={r.id}
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-md border border-border p-3 transition-colors",
              rol === r.id && "border-primary bg-accent",
            )}
          >
            <input
              type="radio"
              name="rol"
              value={r.id}
              checked={rol === r.id}
              onChange={() => setRol(r.id)}
              className="mt-1 accent-[var(--primary)]"
            />
            <span>
              <span className="block text-sm font-medium">
                {r.nombre}
                {r.id === ROL_PREDETERMINADO && (
                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                    (predeterminado)
                  </span>
                )}
              </span>
              <span className="block text-xs text-muted-foreground">{r.descripcion}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <Button type="submit" className="h-[38px] w-full" disabled={enviando}>
        {textoBoton}
      </Button>
    </form>
  );
}
