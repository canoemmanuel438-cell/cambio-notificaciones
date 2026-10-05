import { create } from "zustand";

import type { CriteriosBusqueda } from "@/domain/entities/Filtros";

export type Periodo = "7" | "30" | "60" | "PERSONALIZADO";

export interface ValoresFiltrosGlobales {
  periodo: Periodo;
  desde: string;
  hasta: string;
  adquirente: string;
  emisor: string;
  origen: string;
  circuito: string;
}

interface EstadoFiltros extends ValoresFiltrosGlobales {
  actualizar: (cambios: Partial<ValoresFiltrosGlobales>) => void;
}

export const useFiltrosGlobalesStore = create<EstadoFiltros>((set) => ({
  periodo: "30",
  desde: "",
  hasta: "",
  adquirente: "",
  emisor: "",
  origen: "",
  circuito: "",
  actualizar: (cambios) => set(cambios),
}));

export type ValoresBusqueda = Record<
  | "id"
  | "adquirente"
  | "emisor"
  | "pan"
  | "referencia"
  | "fecha"
  | "monto"
  | "afiliacion"
  | "autorizacion"
  | "estatus",
  string
>;

export const BUSQUEDA_VACIA: ValoresBusqueda = {
  id: "",
  adquirente: "",
  emisor: "",
  pan: "",
  referencia: "",
  fecha: "",
  monto: "",
  afiliacion: "",
  autorizacion: "",
  estatus: "",
};

interface EstadoTrazabilidad {
  valores: ValoresBusqueda;
  aplicados: CriteriosBusqueda | null;
  setValores: (v: ValoresBusqueda) => void;
  aplicar: (c: CriteriosBusqueda | null) => void;
}

/** Conserva la búsqueda al ir a la ficha y "Volver a resultados". */
export const useTrazabilidadStore = create<EstadoTrazabilidad>((set) => ({
  valores: BUSQUEDA_VACIA,
  aplicados: null,
  setValores: (valores) => set({ valores }),
  aplicar: (aplicados) => set({ aplicados }),
}));
