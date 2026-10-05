/** Datos crudos simulados de administración (formato de "backend"). */

export interface LayoutRaw {
  layout_id: string;
  nombre: string;
  fuente: string;
  canal: string;
  version: number;
  campos: number;
  fiids: string;
  estatus: "A" | "I";
  modificado: string;
}

export const LAYOUTS_RAW: LayoutRaw[] = [
  {
    layout_id: "LY-001",
    nombre: "TLF autorizaciones ATM",
    fuente: "TLF",
    canal: "ATM",
    version: 4,
    campos: 10,
    fiids: "B014,B027,B031",
    estatus: "A",
    modificado: "2026-09-24T11:15:00",
  },
  {
    layout_id: "LY-002",
    nombre: "STATS compensación ATM",
    fuente: "STATS",
    canal: "ATM",
    version: 3,
    campos: 7,
    fiids: "B014,B027",
    estatus: "A",
    modificado: "2026-09-05T10:15:00",
  },
  {
    layout_id: "LY-003",
    nombre: "SETLE01 liquidación ATM",
    fuente: "SETLE01",
    canal: "ATM",
    version: 2,
    campos: 7,
    fiids: "B014",
    estatus: "A",
    modificado: "2026-09-01T09:15:00",
  },
  {
    layout_id: "LY-004",
    nombre: "TEF transferencias POS",
    fuente: "TEF",
    canal: "POS",
    version: 5,
    campos: 9,
    fiids: "P102,P118,P120,P133",
    estatus: "A",
    modificado: "2026-09-22T12:15:00",
  },
  {
    layout_id: "LY-005",
    nombre: "Compensación POS",
    fuente: "COMP",
    canal: "POS",
    version: 3,
    campos: 8,
    fiids: "P102,P118",
    estatus: "A",
    modificado: "2026-09-12T10:15:00",
  },
  {
    layout_id: "LY-006",
    nombre: "Liquidación POS",
    fuente: "LIQ",
    canal: "POS",
    version: 2,
    campos: 6,
    fiids: "P102",
    estatus: "A",
    modificado: "2026-09-08T09:15:00",
  },
  {
    layout_id: "LY-007",
    nombre: "Intercambio POS y ATM",
    fuente: "INTX",
    canal: "POS y ATM",
    version: 1,
    campos: 6,
    fiids: "B014,P102",
    estatus: "A",
    modificado: "2026-07-20T10:00:00",
  },
  {
    layout_id: "LY-008",
    nombre: "Fuente papel POS",
    fuente: "PAP",
    canal: "POS",
    version: 2,
    campos: 5,
    fiids: "P133",
    estatus: "I",
    modificado: "2026-09-15T09:15:00",
  },
];

export const MODELO_SEMANTICO_RAW = {
  conexion: { conectada: true, destino: "Cloud SQL · pg-monitor" },
  views: 6,
  explores: 4,
  materializadas: 3,
  actualizado: "2026-09-25T09:33:00",
  metricas: [
    [
      "Operaciones",
      "total_operaciones",
      "Total de operaciones recibidas, sin contar duplicados",
      "count",
      "transacciones",
      "Ejecutivo, POS, ATM, Consulta",
    ],
    [
      "Transacciones autorizadas",
      "autorizadas",
      "Operaciones aprobadas en línea",
      "count",
      "transacciones",
      "Ejecutivo, POS, ATM",
    ],
    [
      "Rechazadas",
      "rechazadas",
      "Operaciones rechazadas en autorización",
      "count",
      "transacciones",
      "POS, ATM",
    ],
    [
      "Importe procesado",
      "importe_procesado",
      "Suma del importe de las operaciones autorizadas",
      "sum",
      "transacciones",
      "Ejecutivo, ATM",
    ],
    [
      "Ticket promedio",
      "ticket_promedio",
      "Importe procesado entre operaciones autorizadas",
      "number",
      "transacciones",
      "POS",
    ],
    [
      "Match online vs. compensación",
      "tasa_match",
      "Autorizadas ya compensadas entre autorizadas con compensación evaluada",
      "number",
      "etapas_transaccion",
      "Ejecutivo",
    ],
    [
      "Pendientes en plazo",
      "pendientes_plazo",
      "Autorizadas en proceso dentro del plazo (débito 30 d, crédito 120 d)",
      "count",
      "etapas_transaccion",
      "Ejecutivo",
    ],
    [
      "Con inconsistencia",
      "con_inconsistencia",
      "Operaciones con al menos una etapa en inconsistencia",
      "count",
      "etapas_transaccion",
      "Ejecutivo, No Match",
    ],
    [
      "Duplicados",
      "duplicados",
      "Operaciones con Llave PET repetida",
      "count",
      "transacciones",
      "Ejecutivo",
    ],
    [
      "Sin match",
      "sin_match",
      "Autorizadas sin compensación o compensadas sin autorización",
      "count",
      "etapas_transaccion",
      "Match, No Match",
    ],
    [
      "Disponibilidad ATM",
      "disponibilidad_atm",
      "Cajeros con operación en el periodo entre cajeros instalados",
      "number",
      "cajeros",
      "ATM",
    ],
    [
      "Cumplimiento SLA",
      "cumplimiento_sla",
      "Procesos concluidos dentro del límite entre procesos ejecutados",
      "number",
      "procesos_sla",
      "SLA",
    ],
    [
      "Alertas abiertas",
      "alertas_abiertas",
      "Alertas sin cierre ni descarte",
      "count",
      "alertas",
      "Ejecutivo, Alertas",
    ],
  ] as const,
};

export const POSTURA_SEGURIDAD_RAW = {
  autenticacion: ["PingOne", "SAML 2.0"],
  controles: [
    ["Cifrado en reposo", "AES-256 en bases de datos, buckets y respaldos", "Datos"],
    ["Cifrado en tránsito", "TLS 1.2 o superior entre usuarios, servicios y bases de datos", "Red"],
    [
      "EncryptionMiddleware",
      "Cifra y descifra campos sensibles en la capa de aplicación",
      "Aplicación",
    ],
    [
      "Gestión de secretos",
      "CyberArk resguarda credenciales, llaves y cadenas de conexión",
      "Secretos",
    ],
    ["Tokenización", "El PAN se reemplaza por un token antes de almacenarse", "Datos de tarjeta"],
    [
      "SecurDPS",
      "Protección de datos sensibles con cifrado que preserva el formato",
      "Datos de tarjeta",
    ],
    [
      "Enmascaramiento de PAN",
      "En pantallas y descargas solo se ven los últimos 4 dígitos",
      "Datos de tarjeta",
    ],
    ["Autenticación", "PingOne mediante SAML, con roles asignados por grupo", "Identidad"],
    [
      "Segregación de ambientes",
      "Desarrollo, QA y Producción en proyectos y redes separados",
      "Infraestructura",
    ],
    ["Monitoreo", "Cloud Monitoring y Cloud Logging de Google Cloud", "Operación"],
    [
      "Trazabilidad de acceso",
      "Accesos, consultas, descargas y cambios quedan en la bitácora",
      "Auditoría",
    ],
  ] as const,
  ambientes: [
    ["Desarrollo", "Sintéticos", "Equipo de desarrollo", "monitor-dev"],
    ["QA", "Enmascarados", "Desarrollo y QA", "monitor-qa"],
    ["Producción", "Reales, tokenizados", "Roles autorizados vía PingOne", "monitor-prd"],
  ] as const,
};
