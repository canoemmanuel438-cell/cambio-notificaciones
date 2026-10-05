import { TrazabilidadPage } from "@/presentation/pages/TrazabilidadPage";

export function MatchPage() {
  return (
    <TrazabilidadPage
      pantalla="MATCH"
      titulo="Match de transacciones"
      subtitulo="Cruce de la autorización contra compensación, liquidación, intercambio y envío de archivo. Filtra por estatus para ver qué no cuadra."
    />
  );
}
