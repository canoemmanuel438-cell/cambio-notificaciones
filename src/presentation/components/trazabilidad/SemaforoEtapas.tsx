import {
  ETAPAS_CICLO,
  ETIQUETAS_ETAPA,
  ETIQUETAS_ETAPA_CORTA,
  estadoEtapa,
  type Transaccion,
} from "@/domain/entities/Transaccion";
import { PuntoSemaforo } from "@/presentation/components/ui-monitor/Monitor";

export function SemaforoEtapas({
  transaccion,
  conEtiquetas = false,
}: {
  transaccion: Transaccion;
  conEtiquetas?: boolean;
}) {
  return (
    <span className={conEtiquetas ? "flex flex-wrap gap-4" : "flex gap-2.5"}>
      {ETAPAS_CICLO.map((e) =>
        conEtiquetas ? (
          <span key={e} className="flex items-center gap-1.5 text-xs">
            <PuntoSemaforo estado={estadoEtapa(transaccion, e)} etiqueta={ETIQUETAS_ETAPA[e]} />
            {ETIQUETAS_ETAPA[e]}
          </span>
        ) : (
          <PuntoSemaforo
            key={e}
            estado={estadoEtapa(transaccion, e)}
            etiqueta={ETIQUETAS_ETAPA_CORTA[e]}
          />
        ),
      )}
    </span>
  );
}
