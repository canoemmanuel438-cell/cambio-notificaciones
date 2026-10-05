import { createFileRoute } from "@tanstack/react-router";

import { DashboardATMPage } from "@/presentation/pages/DashboardATMPage";

const titulo = "Dashboard ATM — Visor PET";
const descripcion = "Operaciones de cajeros: resumen TLF, SETL y conciliación contra STATS.";

export const Route = createFileRoute("/atm")({
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
  component: DashboardATMPage,
});
