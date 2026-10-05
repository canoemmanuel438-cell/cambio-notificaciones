import { createFileRoute } from "@tanstack/react-router";

import { DashboardEjecutivoPage } from "@/presentation/pages/DashboardEjecutivoPage";

const titulo = "Dashboard ejecutivo — Visor PET";
const descripcion =
  "Salud de la operación POS y ATM: volumen, integridad y continuidad del flujo transaccional.";

export const Route = createFileRoute("/")({
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
  component: DashboardEjecutivoPage,
});
