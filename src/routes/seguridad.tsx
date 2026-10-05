import { createFileRoute } from "@tanstack/react-router";

import { SeguridadPage } from "@/presentation/pages/SeguridadPage";

const titulo = "Seguridad — Visor PET";
const descripcion = "Controles de protección de datos, autenticación y segregación de ambientes.";

export const Route = createFileRoute("/seguridad")({
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
  component: SeguridadPage,
});
