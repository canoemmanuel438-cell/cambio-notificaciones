import { createFileRoute } from "@tanstack/react-router";

import { ConfiguracionPage } from "@/presentation/pages/ConfiguracionPage";

const titulo = "Configuración — Visor PET";
const descripcion =
  "Plazos, meta de match, umbrales de alerta y límites de SLA con control por rol.";

export const Route = createFileRoute("/configuracion")({
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
  component: ConfiguracionPage,
});
