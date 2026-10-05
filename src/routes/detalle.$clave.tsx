import { createFileRoute } from "@tanstack/react-router";

import { DetalleIndicadorPage } from "@/presentation/pages/DetalleIndicadorPage";

const descripcion =
  "Operaciones que forman un indicador de los dashboards, con su semáforo y exportación a CSV.";

export const Route = createFileRoute("/detalle/$clave")({
  head: () => ({
    meta: [
      { title: "Detalle de indicador — Visor PET" },
      { name: "description", content: descripcion },
      { property: "og:title", content: "Detalle de indicador" },
      { property: "og:description", content: descripcion },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Detalle,
});

function Detalle() {
  const { clave } = Route.useParams();
  return <DetalleIndicadorPage key={clave} clave={clave} />;
}
