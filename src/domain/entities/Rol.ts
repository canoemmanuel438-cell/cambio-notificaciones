import type { AlcanceEdicion } from "./Parametros";

export type Pantalla =
  | "EJECUTIVO"
  | "TRAZABILIDAD"
  | "MATCH"
  | "REPORTES"
  | "POS"
  | "ATM"
  | "SLA"
  | "ALERTAS"
  | "NO_MATCH"
  | "LAYOUTS"
  | "MODELO_SEMANTICO"
  | "SEGURIDAD"
  | "BITACORA"
  | "CONFIGURACION";

export const PANTALLAS: Pantalla[] = [
  "EJECUTIVO",
  "TRAZABILIDAD",
  "MATCH",
  "REPORTES",
  "POS",
  "ATM",
  "SLA",
  "ALERTAS",
  "NO_MATCH",
  "LAYOUTS",
  "MODELO_SEMANTICO",
  "SEGURIDAD",
  "BITACORA",
  "CONFIGURACION",
];

export type RolId = "ADMINISTRADOR" | "OPERACIONES" | "CONCILIACION" | "EJECUTIVO" | "AUDITORIA";

export interface Rol {
  id: RolId;
  nombre: string;
  descripcion: string;
  pantallas: Pantalla[];
  puedeDescargar: boolean;
  atiendeAlertas: boolean;
  editaParametros: AlcanceEdicion;
}

export const ROLES: Rol[] = [
  {
    id: "ADMINISTRADOR",
    nombre: "Administrador",
    descripcion: "Acceso total: configuración, seguridad, bitácora y atención de alertas",
    pantallas: PANTALLAS,
    puedeDescargar: true,
    atiendeAlertas: true,
    editaParametros: "TODOS",
  },
  {
    id: "OPERACIONES",
    nombre: "Operaciones",
    descripcion: "Dashboard, búsqueda, match, reportes y atención de alertas",
    pantallas: [
      "EJECUTIVO",
      "TRAZABILIDAD",
      "MATCH",
      "REPORTES",
      "POS",
      "ATM",
      "SLA",
      "ALERTAS",
      "NO_MATCH",
      "CONFIGURACION",
    ],
    puedeDescargar: true,
    atiendeAlertas: true,
    editaParametros: "UMBRALES_ALERTA",
  },
  {
    id: "CONCILIACION",
    nombre: "Conciliación",
    descripcion: "Dashboard, búsqueda, match, reportes y No Match",
    pantallas: [
      "EJECUTIVO",
      "TRAZABILIDAD",
      "MATCH",
      "REPORTES",
      "POS",
      "ATM",
      "NO_MATCH",
      "CONFIGURACION",
    ],
    puedeDescargar: true,
    atiendeAlertas: false,
    editaParametros: "NINGUNO",
  },
  {
    id: "EJECUTIVO",
    nombre: "Ejecutivo",
    descripcion: "Dashboard, SLA y reportes, solo consulta",
    pantallas: ["EJECUTIVO", "POS", "ATM", "SLA", "REPORTES"],
    puedeDescargar: false,
    atiendeAlertas: false,
    editaParametros: "NINGUNO",
  },
  {
    id: "AUDITORIA",
    nombre: "Auditoría",
    descripcion: "Consulta de todo el visor e historial, sin descargas",
    pantallas: PANTALLAS,
    puedeDescargar: false,
    atiendeAlertas: false,
    editaParametros: "NINGUNO",
  },
];

export const ROL_PREDETERMINADO: RolId = "OPERACIONES";

export const buscarRol = (id: string): Rol | undefined => ROLES.find((r) => r.id === id);

export const puedeVerPantalla = (rol: Rol, pantalla: Pantalla): boolean =>
  rol.pantallas.includes(pantalla);
