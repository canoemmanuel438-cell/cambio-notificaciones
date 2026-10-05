import { createFileRoute } from "@tanstack/react-router";

import { MatchPage } from "@/presentation/pages/MatchPage";

const titulo = "Match — Visor PET";
const descripcion =
  "Cruce de autorizaciones contra compensación, liquidación e intercambio con semáforo por etapa.";

export const Route = createFileRoute("/match")({
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
  component: MatchPage,
});
