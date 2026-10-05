import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { FichaTransaccionPage } from "@/presentation/pages/FichaTransaccionPage";

export const Route = createFileRoute("/trazabilidad/$id")({
  validateSearch: z.object({ desde: z.string().optional() }),
  head: ({ params }) => ({
    meta: [
      { title: `Ficha ${params.id} — Visor PET` },
      { name: "description", content: `Ficha de trazabilidad de la transacción ${params.id}.` },
      { property: "og:title", content: `Ficha ${params.id}` },
      {
        property: "og:description",
        content: `Ficha de trazabilidad de la transacción ${params.id}.`,
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Ficha,
});

function Ficha() {
  const { id } = Route.useParams();
  const { desde } = Route.useSearch();
  return <FichaTransaccionPage key={id} id={id} desde={desde} />;
}
