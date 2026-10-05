import { createContext, useContext, useState, type ReactNode } from "react";

import { crearDependencias, type Dependencias } from "./container";

const DependencyContext = createContext<Dependencias | null>(null);

export function DependencyProvider({
  children,
  dependencias,
}: {
  children: ReactNode;
  dependencias?: Dependencias;
}) {
  const [valor] = useState(() => dependencias ?? crearDependencias());
  return <DependencyContext.Provider value={valor}>{children}</DependencyContext.Provider>;
}

export function useDependencies(): Dependencias {
  const contexto = useContext(DependencyContext);
  if (!contexto) throw new Error("useDependencies debe usarse dentro de <DependencyProvider>.");
  return contexto;
}

export const useCasosDeUso = () => useDependencies().casosDeUso;
export const useRelojes = () => useDependencies().relojes;
