import { createFileRoute } from "@tanstack/react-router";

import { AyudaPage } from "@/presentation/pages/AyudaPage";

const titulo = "Ayuda — Visor PET";
const descripcion = "Guía rápida de uso del Visor PET por pantalla.";

export const Route = createFileRoute("/ayuda")({
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
  component: AyudaPage,
});
