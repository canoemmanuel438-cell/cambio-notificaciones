export interface ArchivoDescargable {
  nombre: string;
  contenido: string;
  mime: string;
  codificacion: "utf8" | "latin1";
}

/** Descarga en el navegador. Solo se invoca desde manejadores de eventos. */
export const descargarArchivo = (archivo: ArchivoDescargable): void => {
  if (typeof document === "undefined") return;
  const datos =
    archivo.codificacion === "latin1"
      ? Uint8Array.from(archivo.contenido, (c) => c.charCodeAt(0) & 0xff)
      : archivo.contenido;
  const url = URL.createObjectURL(new Blob([datos], { type: archivo.mime }));
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = archivo.nombre;
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  URL.revokeObjectURL(url);
};
