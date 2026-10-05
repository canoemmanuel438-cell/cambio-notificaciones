import type { ReactNode } from "react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export interface ColumnaTabla<T> {
  clave: string;
  encabezado: string;
  alineacion?: "izquierda" | "derecha";
  render: (fila: T) => ReactNode;
}

export function DataTable<T>({
  columnas,
  filas,
  claveDe,
  etiqueta,
}: {
  columnas: ColumnaTabla<T>[];
  filas: T[];
  claveDe: (fila: T) => string;
  etiqueta: string;
}) {
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <Table aria-label={etiqueta}>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            {columnas.map((c) => (
              <TableHead
                key={c.clave}
                className={cn(
                  "whitespace-nowrap text-xs font-medium text-muted-foreground",
                  c.alineacion === "derecha" && "text-right",
                )}
              >
                {c.encabezado}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {filas.map((fila) => (
            <TableRow key={claveDe(fila)}>
              {columnas.map((c) => (
                <TableCell
                  key={c.clave}
                  className={cn(
                    "whitespace-nowrap py-2.5 text-sm",
                    c.alineacion === "derecha" && "text-right",
                  )}
                >
                  {c.render(fila)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
