import { createFileRoute } from "@tanstack/react-router";

import { TrazabilidadPage } from "@/presentation/pages/TrazabilidadPage";

const titulo = "Trazabilidad — Visor PET";
const descripcion = "Busca transacciones POS y ATM y sigue cada una a lo largo del ciclo.";

export const Route = createFileRoute("/trazabilidad/")({
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
  component: TrazabilidadPage,
});
