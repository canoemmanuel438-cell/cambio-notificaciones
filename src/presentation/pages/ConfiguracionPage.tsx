import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ETIQUETAS_GRUPO_PARAMETRO, type Parametro } from "@/domain/entities/Parametros";
import { EstadoConsulta } from "@/presentation/components/estado-consulta/EstadoConsulta";
import { Panel } from "@/presentation/components/ui-monitor/Monitor";
import { AppShell } from "@/presentation/layouts/AppShell";
import { useActualizarParametro, useParametros, useSesion } from "@/presentation/hooks/useMonitor";

function FilaParametro({
  parametro,
  editable,
  onGuardar,
  guardando,
}: {
  parametro: Parametro;
  editable: boolean;
  onGuardar: (v: number) => void;
  guardando: boolean;
}) {
  const [texto, setTexto] = useState(String(parametro.valor));
  const valor = Number(texto);
  const cambiado = texto.trim() !== "" && valor !== parametro.valor;
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 border-t border-border py-3 first:border-t-0">
      <span className="text-sm">{parametro.nombre}</span>
      {editable ? (
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (cambiado) onGuardar(valor);
          }}
        >
          <Input
            type="number"
            step="any"
            min={parametro.minimo}
            max={parametro.maximo}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            className="numeric h-9 w-28 bg-card"
            aria-label={parametro.nombre}
          />
          <span className="w-10 text-xs text-muted-foreground">{parametro.unidad}</span>
          <Button type="submit" size="sm" disabled={!cambiado || guardando}>
            Guardar
          </Button>
        </form>
      ) : (
        <span className="numeric text-sm">
          {parametro.valor} {parametro.unidad}
        </span>
      )}
    </li>
  );
}

export function ConfiguracionPage() {
  const { rol } = useSesion();
  const { datos, cargando, error } = useParametros(rol?.id);
  const { actualizar, actualizando } = useActualizarParametro(rol?.id);

  return (
    <AppShell
      pantalla="CONFIGURACION"
      titulo="Configuración"
      subtitulo="Parámetros de operación del monitor. Cada cambio queda registrado en la Bitácora."
    >
      <EstadoConsulta cargando={cargando} error={error}>
        <div className="grid gap-6 xl:grid-cols-2">
          {datos?.map((g) => (
            <Panel key={g.grupo} titulo={ETIQUETAS_GRUPO_PARAMETRO[g.grupo]}>
              {!g.editable && (
                <p className="mb-2 text-sm text-muted-foreground">
                  Tu rol puede consultar este parámetro, pero no modificarlo.
                </p>
              )}
              <ul>
                {g.parametros.map((p) => (
                  <FilaParametro
                    key={`${p.clave}-${p.valor}`}
                    parametro={p}
                    editable={g.editable}
                    guardando={actualizando}
                    onGuardar={(valor) => actualizar({ clave: p.clave, valor })}
                  />
                ))}
              </ul>
            </Panel>
          ))}
        </div>
      </EstadoConsulta>
    </AppShell>
  );
}
