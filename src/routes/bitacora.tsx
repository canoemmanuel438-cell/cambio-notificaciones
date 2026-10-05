import { createFileRoute } from "@tanstack/react-router";

import { BitacoraPage } from "@/presentation/pages/BitacoraPage";

const titulo = "Bitácora — Visor PET";
const descripcion = "Accesos, búsquedas, descargas y cambios de estado registrados en la sesión.";

export const Route = createFileRoute("/bitacora")({
  head: () => ({
    meta: [
      { title: titulo },
      { name: "description", content: descripcion },
      { property: "og:title", content: titulo },
      { property: "og:description", content: descripcion },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BitacoraPage,
});
