export type Celda = string | number;

export interface Tabla {
  columnas: string[];
  filas: Celda[][];
}

export interface ArchivoExportado {
  nombre: string;
  contenido: string;
  mime: string;
  /** latin1: cada carácter es un byte (PDF). */
  codificacion: "utf8" | "latin1";
  registros: number;
}

const escaparCSV = (valor: Celda): string => {
  const texto = String(valor);
  return /[",;\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
};

const escaparXML = (valor: Celda): string =>
  String(valor)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const escaparPDF = (texto: string): string =>
  texto
    .replace(/•/g, "*")
    .replace(/[–—]/g, "-")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/[^\x20-\xFF]/g, "?");

/** Servicio transversal: convierte tablas y fichas a CSV, Excel (SpreadsheetML) y PDF. */
export class FormatoExportacionService {
  aCSV(tabla: Tabla): string {
    const lineas = [tabla.columnas, ...tabla.filas].map((fila) => fila.map(escaparCSV).join(","));
    return `\uFEFF${lineas.join("\n")}`;
  }

  aExcel(tabla: Tabla, hoja: string): string {
    const fila = (celdas: Celda[]) =>
      `<Row>${celdas
        .map(
          (c) =>
            `<Cell><Data ss:Type="${typeof c === "number" ? "Number" : "String"}">${escaparXML(c)}</Data></Cell>`,
        )
        .join("")}</Row>`;
    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<?mso-application progid="Excel.Sheet"?>',
      '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">',
      `<Worksheet ss:Name="${escaparXML(hoja.slice(0, 31))}"><Table>`,
      fila(tabla.columnas),
      ...tabla.filas.map(fila),
      "</Table></Worksheet></Workbook>",
    ].join("\n");
  }

  aPDF(titulo: string, lineas: string[]): string {
    const cuerpo = lineas.slice(0, 50);
    const flujo = [
      "BT",
      "/F1 14 Tf",
      "50 790 Td",
      `(${escaparPDF(titulo)}) Tj`,
      "/F1 10 Tf",
      "0 -10 Td",
      ...cuerpo.map((l) => `0 -15 Td (${escaparPDF(l)}) Tj`),
      "ET",
    ].join("\n");
    const objetos = [
      "<< /Type /Catalog /Pages 2 0 R >>",
      "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
      `<< /Length ${flujo.length} >>\nstream\n${flujo}\nendstream`,
    ];
    let pdf = "%PDF-1.4\n";
    const offsets: number[] = [];
    objetos.forEach((obj, i) => {
      offsets.push(pdf.length);
      pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
    });
    const xref = pdf.length;
    pdf += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
    pdf += offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("");
    pdf += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
    return pdf;
  }

  nombreArchivo(prefijo: string, fecha: Date, extension: "csv" | "xls" | "pdf"): string {
    const iso = fecha.toISOString().slice(0, 16).replace(/[:T]/g, "-");
    return `${prefijo}-${iso}.${extension}`;
  }

  csv(prefijo: string, tabla: Tabla, fecha: Date): ArchivoExportado {
    return {
      nombre: this.nombreArchivo(prefijo, fecha, "csv"),
      contenido: this.aCSV(tabla),
      mime: "text/csv;charset=utf-8",
      codificacion: "utf8",
      registros: tabla.filas.length,
    };
  }

  excel(prefijo: string, tabla: Tabla, fecha: Date): ArchivoExportado {
    return {
      nombre: this.nombreArchivo(prefijo, fecha, "xls"),
      contenido: this.aExcel(tabla, prefijo),
      mime: "application/vnd.ms-excel",
      codificacion: "utf8",
      registros: tabla.filas.length,
    };
  }

  pdf(prefijo: string, titulo: string, lineas: string[], fecha: Date): ArchivoExportado {
    return {
      nombre: this.nombreArchivo(prefijo, fecha, "pdf"),
      contenido: this.aPDF(titulo, lineas),
      mime: "application/pdf",
      codificacion: "latin1",
      registros: 1,
    };
  }
}
