import type { Catalogos, FuenteArchivo, RecepcionArchivo } from "@/domain/entities/Otros";
import type { EjecucionSLA, ProcesoSLA } from "@/domain/entities/ProcesoSLA";
import type {
  CatalogoRaw,
  EjecucionSLARaw,
  ProcesoRaw,
  RecepcionRaw,
} from "@/infrastructure/mock/data/generador";

/** Mappers de procesos SLA, recepción de archivos y catálogos. */
export const OperacionMapper = {
  procesoDesdeRaw(raw: ProcesoRaw): ProcesoSLA {
    return {
      id: raw.id,
      nombre: raw.name,
      tipo: raw.kind === "duration" ? "DURACION" : "HORA_LIMITE",
      limiteMin: raw.limit_min,
    };
  },

  ejecucionesDesdeRaw(procesos: ProcesoRaw[], raws: EjecucionSLARaw[]): EjecucionSLA[] {
    const porId = new Map(procesos.map((p) => [p.id, OperacionMapper.procesoDesdeRaw(p)]));
    return raws.flatMap((raw) => {
      const proceso = porId.get(raw.process_id);
      if (!proceso) return [];
      return [
        {
          proceso,
          fecha: raw.date,
          programadoMin: raw.scheduled_min,
          llegadaMin: raw.arrival_min,
          inicioMin: raw.start_min,
          finMin: raw.end_min,
          p50: raw.p50,
          p95: raw.p95,
        },
      ];
    });
  },

  recepcionDesdeRaw(raw: RecepcionRaw): RecepcionArchivo {
    return {
      fuente: raw.source as FuenteArchivo,
      fechaDatos: raw.data_date,
      recibido: raw.received,
    };
  },

  catalogoDesdeRaw(raw: CatalogoRaw): Catalogos {
    return {
      adquirentes: raw.acquirers.map((a) => ({ id: a.id, nombre: a.name })),
      emisores: raw.issuers.map((e) => ({ id: e.id, nombre: e.name })),
    };
  },
};
