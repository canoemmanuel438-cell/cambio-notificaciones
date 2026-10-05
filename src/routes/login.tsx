import { createFileRoute } from "@tanstack/react-router";

import { LoginPage } from "@/presentation/pages/LoginPage";

const titulo = "Iniciar sesión — Visor PET";
const descripcion =
  "Acceso al monitor transaccional POS y ATM. Cada transacción, del cobro a la liquidación.";

export const Route = createFileRoute("/login")({
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
  component: LoginPage,
});
