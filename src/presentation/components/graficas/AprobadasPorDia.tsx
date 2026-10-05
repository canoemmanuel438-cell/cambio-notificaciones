import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { PuntoAprobacion } from "@/application/useCases/dashboard/ObtenerDashboardPOSUseCase";
import { formatearDiaCorto } from "@/shared/utils/formato";

export function AprobadasPorDia({
  datos,
  etiqueta,
  onSeleccionarDia,
}: {
  datos: PuntoAprobacion[];
  etiqueta: string;
  /** Si se indica, cada día es clicable (drill-down a sus operaciones). */
  onSeleccionarDia?: (fecha: string) => void;
}) {
  return (
    <div
      className={onSeleccionarDia ? "h-60 cursor-pointer" : "h-60"}
      role="img"
      aria-label={etiqueta}
    >
      <ResponsiveContainer>
        <BarChart
          data={datos}
          margin={{ left: -20, right: 8, top: 8 }}
          onClick={(e) => e?.activeLabel && onSeleccionarDia?.(String(e.activeLabel))}
        >
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="fecha"
            tickFormatter={formatearDiaCorto}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            minTickGap={24}
          />
          <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
          <Tooltip
            labelFormatter={(v) => formatearDiaCorto(String(v))}
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              fontSize: 12,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="aprobadas" name="Autorizadas" stackId="a" fill="var(--primary)" />
          <Bar
            dataKey="rechazadas"
            name="Rechazadas"
            stackId="a"
            fill="var(--serie-2)"
            radius={[3, 3, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
