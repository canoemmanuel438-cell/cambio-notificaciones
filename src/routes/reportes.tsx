import { createFileRoute } from "@tanstack/react-router";

import { ReportesPage } from "@/presentation/pages/ReportesPage";

const titulo = "Reportes — Visor PET";
const descripcion = "Reporte diario de integridad por fuente, alertas y conciliación.";

export const Route = createFileRoute("/reportes")({
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
  component: ReportesPage,
});
