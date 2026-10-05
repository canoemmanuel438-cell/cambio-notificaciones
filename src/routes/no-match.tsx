import { createFileRoute } from "@tanstack/react-router";

import { ReporteNoMatchPage } from "@/presentation/pages/ReporteNoMatchPage";

const titulo = "Reporte de No Match — Visor PET";
const descripcion = "Transacciones sin match entre el proceso online y el de compensación.";

export const Route = createFileRoute("/no-match")({
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
  component: ReporteNoMatchPage,
});
