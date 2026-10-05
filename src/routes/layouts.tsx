import { createFileRoute } from "@tanstack/react-router";

import { LayoutsPage } from "@/presentation/pages/LayoutsPage";

const titulo = "Web Manager de layouts — Visor PET";
const descripcion = "Catálogo de layouts de ingesta por fuente, canal y FIID.";

export const Route = createFileRoute("/layouts")({
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
  component: LayoutsPage,
});
