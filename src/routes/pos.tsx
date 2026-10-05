import { createFileRoute } from "@tanstack/react-router";

import { DashboardPOSPage } from "@/presentation/pages/DashboardPOSPage";

const titulo = "Dashboard POS — Visor PET";
const descripcion =
  "Monitoreo del circuito POS: autorizaciones, rechazos, circuitos, compensación, posteo y depósito.";

export const Route = createFileRoute("/pos")({
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
  component: DashboardPOSPage,
});
