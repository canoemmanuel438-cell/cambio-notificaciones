/** Adaptador de almacenamiento persistente del navegador. Seguro en SSR (no-op). */
export interface Almacenamiento {
  leer<T>(clave: string, porDefecto: T): T;
  escribir<T>(clave: string, valor: T): void;
}

export const almacenamientoNavegador: Almacenamiento = {
  leer<T>(clave: string, porDefecto: T): T {
    if (typeof window === "undefined") return porDefecto;
    try {
      const texto = window.localStorage.getItem(clave);
      return texto ? (JSON.parse(texto) as T) : porDefecto;
    } catch {
      return porDefecto;
    }
  },
  escribir<T>(clave: string, valor: T): void {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(clave, JSON.stringify(valor));
    } catch {
      /* almacenamiento lleno o bloqueado: se ignora */
    }
  },
};

export const crearAlmacenamientoMemoria = (): Almacenamiento => {
  const datos = new Map<string, string>();
  return {
    leer: <T>(clave: string, porDefecto: T): T => {
      const texto = datos.get(clave);
      return texto ? (JSON.parse(texto) as T) : porDefecto;
    },
    escribir: <T>(clave: string, valor: T) => {
      datos.set(clave, JSON.stringify(valor));
    },
  };
};
