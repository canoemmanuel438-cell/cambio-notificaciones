import { Link } from "@tanstack/react-router";
import { ArrowLeft, FileSpreadsheet, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { TonoMensaje } from "@/application/services/FichaService";
import {
  ETIQUETAS_CIRCUITO,
  ETIQUETAS_ESTADO_ETAPA,
  ETIQUETAS_ESTATUS,
  ETIQUETAS_OPERACION_ATM,
  ETIQUETAS_ORIGEN,
  ETIQUETAS_TIPO_MENSAJE,
  ETIQUETAS_TIPO_TARJETA,
  enmascararPAN,
} from "@/domain/entities/Transaccion";
import { useCasosDeUso } from "@/infrastructure/di/DependencyProvider";
import { EstadoConsulta } from "@/presentation/components/estado-consulta/EstadoConsulta";
import { SemaforoEtapas } from "@/presentation/components/trazabilidad/SemaforoEtapas";
import {
  Chip,
  Panel,
  PuntoSemaforo,
  type Tono,
} from "@/presentation/components/ui-monitor/Monitor";
import { TONO_ESTATUS } from "@/presentation/components/ui-monitor/tonos";
import { AppShell } from "@/presentation/layouts/AppShell";
import { useDescarga, useFichaTransaccion, useSesion } from "@/presentation/hooks/useMonitor";
import { formatearFecha, formatearMoneda } from "@/shared/utils/formato";

const TONO_MENSAJE: Record<TonoMensaje, string> = {
  exito: "bg-verde-suave text-verde",
  info: "bg-accent text-accent-foreground",
  alerta: "bg-ambar-suave text-ambar",
  error: "bg-rojo-suave text-rojo",
};
const TONO_ETAPA: Record<string, Tono> = {
  COMPLETADO: "verde",
  PENDIENTE: "gris",
  INCONSISTENCIA: "rojo",
  NO_APLICA: "gris",
};

function Dato({
  etiqueta,
  valor,
  mono = false,
}: {
  etiqueta: string;
  valor: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{etiqueta}</dt>
      <dd className={mono ? "numeric text-sm" : "text-sm"}>{valor}</dd>
    </div>
  );
}

/** `desde`: clave del indicador de detalle (drill-down) desde el que se abrió la ficha; permite volver a él. */
export function FichaTransaccionPage({ id, desde }: { id: string; desde?: string | undefined }) {
  const { rol } = useSesion();
  const { datos, cargando, error } = useFichaTransaccion(id, rol?.id);
  const { exportarFicha } = useCasosDeUso();
  const { descargar, descargando } = useDescarga();

  return (
    <AppShell
      pantalla="TRAZABILIDAD"
      titulo="Ficha de la transacción"
      subtitulo={id}
      acciones={
        <>
          <Button asChild variant="outline" className="h-[38px]">
            {desde ? (
              <Link to="/detalle/$clave" params={{ clave: desde }}>
                <ArrowLeft className="mr-2 h-4 w-4" aria-hidden /> Volver al detalle
              </Link>
            ) : (
              <Link to="/trazabilidad">
                <ArrowLeft className="mr-2 h-4 w-4" aria-hidden /> Volver a resultados
              </Link>
            )}
          </Button>
          {rol?.puedeDescargar && datos && (
            <>
              <Button
                variant="outline"
                className="h-[38px]"
                disabled={descargando}
                onClick={() => descargar(() => exportarFicha.execute(id, "EXCEL", rol.id))}
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" aria-hidden /> Descargar Excel
              </Button>
              <Button
                className="h-[38px]"
                disabled={descargando}
                onClick={() => descargar(() => exportarFicha.execute(id, "PDF", rol.id))}
              >
                <FileText className="mr-2 h-4 w-4" aria-hidden /> Descargar PDF
              </Button>
            </>
          )}
        </>
      }
    >
      <EstadoConsulta cargando={cargando} error={error}>
        {datos && (
          <div className="space-y-6">
            {datos.mensajes.map((m) => (
              <p
                key={m.texto}
                className={`rounded-md p-3 text-sm ${TONO_MENSAJE[m.tono]}`}
                role="status"
              >
                {m.texto}
              </p>
            ))}

            <Panel titulo="Datos de la transacción">
              <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Dato etiqueta="ID" valor={datos.transaccion.id} mono />
                <Dato etiqueta="Canal" valor={datos.transaccion.canal} />
                <Dato etiqueta="Fecha" valor={formatearFecha(datos.transaccion.fecha)} />
                <Dato
                  etiqueta="Estatus"
                  valor={
                    <Chip tono={TONO_ESTATUS[datos.estatus]}>
                      {ETIQUETAS_ESTATUS[datos.estatus]}
                    </Chip>
                  }
                />
                <Dato
                  etiqueta="Adquirente"
                  valor={`${datos.transaccion.adquirente} · ${datos.transaccion.adquirenteId}`}
                />
                <Dato
                  etiqueta="Emisor"
                  valor={`${datos.transaccion.emisor} · ${datos.transaccion.emisorId}`}
                />
                <Dato etiqueta="Afiliación" valor={datos.transaccion.afiliacion} mono />
                <Dato etiqueta="PAN" valor={enmascararPAN(datos.transaccion.pan)} mono />
                <Dato etiqueta="Referencia" valor={datos.transaccion.referencia} mono />
                <Dato etiqueta="Autorización" valor={datos.transaccion.autorizacion || "—"} mono />
                <Dato
                  etiqueta="Tipo"
                  valor={ETIQUETAS_TIPO_TARJETA[datos.transaccion.tipoTarjeta]}
                />
                <Dato etiqueta="Monto" valor={formatearMoneda(datos.transaccion.monto)} mono />
                <Dato
                  etiqueta="Tipo de mensaje"
                  valor={ETIQUETAS_TIPO_MENSAJE[datos.transaccion.tipoMensaje]}
                />
                <Dato etiqueta="Código DC" valor={datos.transaccion.codigoDC} mono />
                <Dato
                  etiqueta="Archivo de origen"
                  valor={datos.transaccion.archivoOrigen || "—"}
                  mono
                />
                {datos.transaccion.circuito && (
                  <Dato
                    etiqueta="Circuito"
                    valor={ETIQUETAS_CIRCUITO[datos.transaccion.circuito]}
                  />
                )}
                {datos.transaccion.origen && (
                  <Dato etiqueta="Origen" valor={ETIQUETAS_ORIGEN[datos.transaccion.origen]} />
                )}
                {datos.transaccion.operacionATM && (
                  <Dato
                    etiqueta="Operación"
                    valor={ETIQUETAS_OPERACION_ATM[datos.transaccion.operacionATM]}
                  />
                )}
                {datos.transaccion.aprobada && (
                  <Dato
                    etiqueta="Plazo de presentación"
                    valor={
                      datos.plazo.vencido ? "Vencido" : `Quedan ${datos.plazo.diasRestantes} días`
                    }
                  />
                )}
                {datos.transaccion.duplicidad && (
                  <Dato
                    etiqueta="Llave de correlación PET"
                    valor={datos.transaccion.duplicidad.llavePET}
                    mono
                  />
                )}
              </dl>
            </Panel>

            <Panel titulo="Semáforo de trazabilidad">
              <SemaforoEtapas transaccion={datos.transaccion} conEtiquetas />
            </Panel>

            <Panel titulo="Cruce de trazabilidad por proceso">
              <div className="overflow-x-auto">
                <table className="w-full text-sm" aria-label="Cruce de trazabilidad por proceso">
                  <thead className="text-left text-xs text-muted-foreground">
                    <tr>
                      <th className="py-2 font-medium">Proceso</th>
                      <th className="font-medium">Fuente</th>
                      <th className="font-medium">Nombre de archivo</th>
                      <th className="font-medium">Estatus</th>
                    </tr>
                  </thead>
                  <tbody>
                    {datos.cruce.map((c) => (
                      <tr key={c.proceso} className="border-t border-border">
                        <td className="py-2.5">{c.proceso}</td>
                        <td>{c.fuente}</td>
                        <td className="numeric text-xs">{c.archivo}</td>
                        <td>
                          <span className="flex items-center gap-2">
                            <PuntoSemaforo estado={c.estado} />
                            <Chip tono={TONO_ETAPA[c.estado] ?? "gris"}>
                              {ETIQUETAS_ESTADO_ETAPA[c.estado]}
                            </Chip>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>

            {datos.contraparte && (
              <p className="text-sm">
                Registro relacionado:{" "}
                <Link
                  to="/trazabilidad/$id"
                  params={{ id: datos.contraparte.id }}
                  className="numeric text-primary underline"
                >
                  {datos.contraparte.id}
                </Link>
              </p>
            )}
          </div>
        )}
      </EstadoConsulta>
    </AppShell>
  );
}
