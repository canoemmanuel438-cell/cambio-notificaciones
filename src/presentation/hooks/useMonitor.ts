import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import type { ArchivoExportado } from "@/application/services/FormatoExportacionService";
import type { FiltrosAlertas } from "@/application/useCases/alertas";
import type { CategoriaNoMatch } from "@/application/useCases/noMatch";
import type { FiltrosLayouts } from "@/domain/entities/Administracion";
import type { EstadoAlerta } from "@/domain/entities/Alerta";
import type { CriteriosBusqueda, FiltrosGlobales } from "@/domain/entities/Filtros";
import type { Pantalla, RolId } from "@/domain/entities/Rol";
import type { Result } from "@/domain/shared/Result";
import { useCasosDeUso, useRelojes } from "@/infrastructure/di/DependencyProvider";
import { descargarArchivo } from "@/shared/utils/descarga";

/** Convierte un Result en dato o lanza el error tipado para react-query. */
const desenvolver = async <T>(promesa: Promise<Result<T>>): Promise<T> => {
  const r = await promesa;
  if (!r.success) throw r.error;
  return r.data;
};

const SIN_REFRESCO = { staleTime: Number.POSITIVE_INFINITY, refetchOnWindowFocus: false } as const;

export function useSesion() {
  const { obtenerSesion } = useCasosDeUso();
  const q = useQuery({
    queryKey: ["sesion"],
    queryFn: () => desenvolver(obtenerSesion.execute()),
    ...SIN_REFRESCO,
  });
  return { rol: q.data?.rol ?? null, ultimoRol: q.data?.ultimoRol, cargando: q.isPending };
}

export function useAccionesSesion() {
  const { iniciarSesion, cerrarSesion } = useCasosDeUso();
  const cliente = useQueryClient();
  const refrescar = () =>
    Promise.all([
      cliente.invalidateQueries({ queryKey: ["sesion"] }),
      cliente.invalidateQueries({ queryKey: ["bitacora"] }),
    ]);
  const iniciar = useMutation({
    mutationFn: (rol: RolId) => desenvolver(iniciarSesion.execute(rol)),
    onSuccess: refrescar,
  });
  const cerrar = useMutation({
    mutationFn: () => desenvolver(cerrarSesion.execute()),
    onSuccess: refrescar,
  });
  return {
    iniciar: iniciar.mutateAsync,
    cerrar: cerrar.mutateAsync,
    procesando: iniciar.isPending || cerrar.isPending,
  };
}

export function useRegistrarNavegacion(pantalla: Pantalla, rol: RolId | undefined) {
  const { registrarEvento } = useCasosDeUso();
  const cliente = useQueryClient();
  const ultima = useRef<string | null>(null);
  useEffect(() => {
    if (!rol || ultima.current === `${rol}-${pantalla}`) return;
    ultima.current = `${rol}-${pantalla}`;
    void registrarEvento
      .execute(rol, "Navegación", pantalla)
      .then(() => cliente.invalidateQueries({ queryKey: ["bitacora"] }));
  }, [pantalla, rol, registrarEvento, cliente]);
}

export const useAhora = () => useRelojes().datos();

export function useCatalogos() {
  const { obtenerCatalogos } = useCasosDeUso();
  return useQuery({
    queryKey: ["catalogos"],
    queryFn: () => desenvolver(obtenerCatalogos.execute()),
    ...SIN_REFRESCO,
  });
}

const estado = <T>(q: { data: T | undefined; isPending: boolean; error: Error | null }) => ({
  datos: q.data,
  cargando: q.isPending,
  error: q.error ? q.error.message : null,
});

export function useResumenEjecutivo(filtros: FiltrosGlobales) {
  const { obtenerResumenEjecutivo } = useCasosDeUso();
  return estado(
    useQuery({
      queryKey: ["ejecutivo", filtros],
      queryFn: () => desenvolver(obtenerResumenEjecutivo.execute(filtros)),
    }),
  );
}

export function useDashboardPOS(filtros: FiltrosGlobales) {
  const { obtenerDashboardPOS } = useCasosDeUso();
  return estado(
    useQuery({
      queryKey: ["pos", filtros],
      queryFn: () => desenvolver(obtenerDashboardPOS.execute(filtros)),
    }),
  );
}

export function useDashboardATM(filtros: FiltrosGlobales) {
  const { obtenerDashboardATM } = useCasosDeUso();
  return estado(
    useQuery({
      queryKey: ["atm", filtros],
      queryFn: () => desenvolver(obtenerDashboardATM.execute(filtros)),
    }),
  );
}

export function useDashboardSLA(fecha: string | undefined) {
  const { obtenerDashboardSLA } = useCasosDeUso();
  return estado(
    useQuery({
      queryKey: ["sla", fecha ?? "hoy"],
      queryFn: () => desenvolver(obtenerDashboardSLA.execute(fecha)),
    }),
  );
}

export function useBusquedaTransacciones(
  criterios: CriteriosBusqueda | null,
  rol: RolId | undefined,
) {
  const { buscarTransacciones } = useCasosDeUso();
  const cliente = useQueryClient();
  return estado(
    useQuery({
      queryKey: ["trazabilidad", criterios],
      enabled: criterios !== null && rol !== undefined,
      queryFn: async () => {
        const datos = await desenvolver(buscarTransacciones.execute(criterios!, rol!));
        void cliente.invalidateQueries({ queryKey: ["bitacora"] });
        return datos;
      },
      ...SIN_REFRESCO,
      gcTime: Number.POSITIVE_INFINITY,
    }),
  );
}

export function useDetalleIndicador(
  clave: string,
  filtros: FiltrosGlobales,
  rol: RolId | undefined,
) {
  const { obtenerDetalleIndicador } = useCasosDeUso();
  const cliente = useQueryClient();
  return estado(
    useQuery({
      queryKey: ["detalle", clave, filtros],
      enabled: rol !== undefined,
      queryFn: async () => {
        const datos = await desenvolver(obtenerDetalleIndicador.execute(clave, filtros, rol!));
        void cliente.invalidateQueries({ queryKey: ["bitacora"] });
        return datos;
      },
      ...SIN_REFRESCO,
    }),
  );
}

export function useEjemplosBusqueda() {
  const { obtenerEjemplosBusqueda } = useCasosDeUso();
  return useQuery({
    queryKey: ["ejemplos"],
    queryFn: () => desenvolver(obtenerEjemplosBusqueda.execute()),
    ...SIN_REFRESCO,
  });
}

export function useFichaTransaccion(id: string, rol: RolId | undefined) {
  const { obtenerFichaTransaccion } = useCasosDeUso();
  const cliente = useQueryClient();
  return estado(
    useQuery({
      queryKey: ["ficha", id],
      enabled: rol !== undefined,
      queryFn: async () => {
        const datos = await desenvolver(obtenerFichaTransaccion.execute(id, rol!));
        void cliente.invalidateQueries({ queryKey: ["bitacora"] });
        return datos;
      },
      ...SIN_REFRESCO,
    }),
  );
}

export function useAlertas(filtros: FiltrosAlertas) {
  const { obtenerAlertas } = useCasosDeUso();
  return estado(
    useQuery({
      queryKey: ["alertas", filtros],
      queryFn: () => desenvolver(obtenerAlertas.execute(filtros)),
    }),
  );
}

export function useDetalleAlerta(id: string | null, rol: RolId | undefined) {
  const { obtenerDetalleAlerta } = useCasosDeUso();
  return estado(
    useQuery({
      queryKey: ["alertas", "detalle", id],
      enabled: id !== null && rol !== undefined,
      queryFn: () => desenvolver(obtenerDetalleAlerta.execute(id!, rol!)),
    }),
  );
}

export function useCambiarEstadoAlerta(rol: RolId | undefined) {
  const { cambiarEstadoAlerta } = useCasosDeUso();
  const cliente = useQueryClient();
  const m = useMutation({
    mutationFn: ({ id, destino }: { id: string; destino: EstadoAlerta }) =>
      desenvolver(cambiarEstadoAlerta.execute(id, destino, rol!)),
    onSuccess: (alerta) => {
      toast.success(`Alerta ${alerta.id} actualizada`);
      void cliente.invalidateQueries({ queryKey: ["alertas"] });
      void cliente.invalidateQueries({ queryKey: ["ejecutivo"] });
      void cliente.invalidateQueries({ queryKey: ["bitacora"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return { cambiar: m.mutate, cambiando: m.isPending };
}

export function useReporteNoMatch(categoria: CategoriaNoMatch) {
  const { obtenerReporteNoMatch } = useCasosDeUso();
  return estado(
    useQuery({
      queryKey: ["nomatch", categoria],
      queryFn: () => desenvolver(obtenerReporteNoMatch.execute(categoria)),
    }),
  );
}

export function useBitacora() {
  const { obtenerBitacora } = useCasosDeUso();
  return estado(
    useQuery({ queryKey: ["bitacora"], queryFn: () => desenvolver(obtenerBitacora.execute()) }),
  );
}

/** Ejecuta una exportación, descarga el archivo y avisa con un toast. */
export function useDescarga() {
  const cliente = useQueryClient();
  const [descargando, setDescargando] = useState(false);
  const descargar = async (accion: () => Promise<Result<ArchivoExportado>>) => {
    setDescargando(true);
    try {
      const r = await accion();
      if (!r.success) {
        toast.error(r.error.message);
        return;
      }
      descargarArchivo(r.data);
      toast.success(`Descarga lista: ${r.data.nombre}`);
      void cliente.invalidateQueries({ queryKey: ["bitacora"] });
    } finally {
      setDescargando(false);
    }
  };
  return { descargar, descargando };
}

export function usePaginacion<T>(items: T[], tamano = 15) {
  const [pagina, setPagina] = useState(1);
  const paginas = Math.max(1, Math.ceil(items.length / tamano));
  useEffect(() => setPagina(1), [items]);
  const visibles = useMemo(
    () => items.slice((pagina - 1) * tamano, pagina * tamano),
    [items, pagina, tamano],
  );
  return { visibles, pagina: Math.min(pagina, paginas), paginas, setPagina, total: items.length };
}

export function useParametros(rol: RolId | undefined) {
  const { obtenerParametros } = useCasosDeUso();
  return estado(
    useQuery({
      queryKey: ["parametros", rol],
      enabled: rol !== undefined,
      queryFn: () => desenvolver(obtenerParametros.execute(rol!)),
    }),
  );
}

export function useActualizarParametro(rol: RolId | undefined) {
  const { actualizarParametro } = useCasosDeUso();
  const cliente = useQueryClient();
  const m = useMutation({
    mutationFn: ({ clave, valor }: { clave: string; valor: number }) =>
      desenvolver(actualizarParametro.execute(clave, valor, rol!)),
    onSuccess: (p) => {
      toast.success(`${p.nombre} actualizado`);
      void cliente.invalidateQueries({ queryKey: ["parametros"] });
      void cliente.invalidateQueries({ queryKey: ["bitacora"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return { actualizar: m.mutate, actualizando: m.isPending };
}

export function useLayouts(filtros: FiltrosLayouts) {
  const { obtenerLayouts } = useCasosDeUso();
  return estado(
    useQuery({
      queryKey: ["layouts", filtros],
      queryFn: () => desenvolver(obtenerLayouts.execute(filtros)),
      ...SIN_REFRESCO,
    }),
  );
}

export function useModeloSemantico() {
  const { obtenerModeloSemantico } = useCasosDeUso();
  return estado(
    useQuery({
      queryKey: ["modelo-semantico"],
      queryFn: () => desenvolver(obtenerModeloSemantico.execute()),
      ...SIN_REFRESCO,
    }),
  );
}

export function usePosturaSeguridad() {
  const { obtenerPosturaSeguridad } = useCasosDeUso();
  return estado(
    useQuery({
      queryKey: ["seguridad"],
      queryFn: () => desenvolver(obtenerPosturaSeguridad.execute()),
      ...SIN_REFRESCO,
    }),
  );
}
