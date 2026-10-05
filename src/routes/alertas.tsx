import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { AlertasPage } from "@/presentation/pages/AlertasPage";

const titulo = "Alertas — Visor PET";
const descripcion = "Inconsistencias de negocio y eventos técnicos, con seguimiento de atención.";

export const Route = createFileRoute("/alertas")({
  validateSearch: z.object({ grupo: z.string().optional() }),
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
  component: Alertas,
});

function Alertas() {
  const { grupo } = Route.useSearch();
  return <AlertasPage key={grupo ?? "todas"} grupoInicial={grupo} />;
}
