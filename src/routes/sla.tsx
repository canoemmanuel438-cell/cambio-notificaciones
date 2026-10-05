import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { DashboardSLAPage } from "@/presentation/pages/DashboardSLAPage";

const titulo = "Dashboard de SLA — Visor PET";
const descripcion =
  "Tiempos de procesamiento y entrega, desviaciones e incumplimientos de los procesos.";

export const Route = createFileRoute("/sla")({
  validateSearch: z.object({ fecha: z.string().optional() }),
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
  component: Sla,
});

function Sla() {
  const { fecha } = Route.useSearch();
  return <DashboardSLAPage key={fecha ?? "hoy"} fechaInicial={fecha} />;
}
