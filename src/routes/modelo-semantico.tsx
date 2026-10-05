import { createFileRoute } from "@tanstack/react-router";

import { ModeloSemanticoPage } from "@/presentation/pages/ModeloSemanticoPage";

const titulo = "Modelo semántico — Visor PET";
const descripcion = "Definición única de las métricas del visor.";

export const Route = createFileRoute("/modelo-semantico")({
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
  component: ModeloSemanticoPage,
});
