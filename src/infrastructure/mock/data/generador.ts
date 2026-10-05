/**
 * Simulador del origen de datos (formato "crudo", snake_case). Todo es sintético y
 * determinista (semilla 20260925). La UI nunca ve este formato: pasa por los mappers.
 */

export interface EtapaRaw {
  stage: "AUT" | "COMP" | "LIQ" | "INT" | "ENV";
  status: "OK" | "PEND" | "ERR" | "NA";
  source: string;
  file?: string;
}

export interface TransaccionRaw {
  tx_id: string;
  channel: "POS" | "ATM";
  ts: string;
  acquirer_name: string;
  acquirer_id: string;
  issuer_name: string;
  issuer_id: string;
  merchant_id: string;
  pan: string;
  reference: string;
  auth_code: string;
  card_type: "D" | "C";
  amount: number;
  mti: "210" | "220" | "420";
  dc: "DC01" | "DC00";
  original_file: string;
  cleared_amount?: number;
  approved: boolean;
  reject_code?: string;
  reject_desc?: string;
  circuit?: string;
  origin?: string;
  atm_op?: string;
  issue?: string;
  dup?: {
    pet_key: string;
    role: "ORIGINAL" | "DUPLICADO";
    peer_id: string;
    file: string;
    line: number;
    received_at: string;
  };
  posting?: "PEND" | "OK";
  deposit?: "PEND" | "OK";
  claim?: "OPEN" | "RESOLVED";
  stages: EtapaRaw[];
}

export interface AlertaRaw {
  alert_id: string;
  category: "BUSINESS" | "TECH";
  group: string;
  type: string;
  stage: string;
  source: string;
  ts: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  status: "OPEN" | "IN_PROGRESS" | "CLOSED";
  tx_id?: string;
}

export interface ProcesoRaw {
  id: string;
  name: string;
  kind: "duration" | "deadline";
  limit_min: number;
}

export interface EjecucionSLARaw {
  process_id: string;
  date: string;
  scheduled_min: number;
  arrival_min?: number;
  start_min?: number;
  end_min?: number;
  p50?: number;
  p95?: number;
}

export interface RecepcionRaw {
  source: "TLF" | "STATS" | "SETL" | "COMP_POS" | "TEF" | "EPAPE";
  data_date: string;
  received: boolean;
}

export interface CatalogoRaw {
  acquirers: { id: string; name: string; merchants: string[] }[];
  issuers: { id: string; name: string }[];
}

export interface ParametroRaw {
  key: string;
  group: "deadline" | "match_goal" | "alert_threshold" | "sla_limit";
  label: string;
  unit: "days" | "pct" | "min";
  value: number;
  min: number;
  max: number;
}

export interface DatasetRaw {
  transacciones: TransaccionRaw[];
  alertas: AlertaRaw[];
  procesos: ProcesoRaw[];
  ejecuciones: EjecucionSLARaw[];
  recepciones: RecepcionRaw[];
  catalogo: CatalogoRaw;
  parametros: ParametroRaw[];
}

export const AHORA_SIMULADO = Date.UTC(2026, 8, 25, 9, 40);
const SEMILLA = 20260925;
const DIA = 86_400_000;
const HOY = Date.UTC(2026, 8, 25);
const DIAS_GENERADOS = 60;
const FECHA_SETL_FALTANTE = "2026-09-24";
const FECHA_EPAPE_FALTANTE = "2026-09-17";

const crearAleatorio = (semilla: number) => {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

type Aleatorio = () => number;

const pad = (n: number, l: number) => String(n).padStart(l, "0");
const dia = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const compacta = (ms: number) => dia(ms).replace(/-/g, "");
const entero = (r: Aleatorio, min: number, max: number) => min + Math.floor(r() * (max - min + 1));
const digitos = (r: Aleatorio, n: number) =>
  Array.from({ length: n }, (_, i) =>
    String(i === 0 ? 1 + Math.floor(r() * 9) : Math.floor(r() * 10)),
  ).join("");
const ALFANUM = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789";
const alfanum = (r: Aleatorio, n: number) =>
  Array.from({ length: n }, () => ALFANUM[Math.floor(r() * ALFANUM.length)]!).join("");

const ponderado = <T>(r: Aleatorio, opciones: [T, number][]): T => {
  const total = opciones.reduce((s, [, w]) => s + w, 0);
  let x = r() * total;
  for (const [valor, peso] of opciones) {
    x -= peso;
    if (x < 0) return valor;
  }
  return opciones[opciones.length - 1]![0];
};

const PESOS_HORA = [
  1, 0.6, 0.4, 0.3, 0.3, 0.5, 1, 2, 3, 4, 5, 6, 7, 7.5, 7.5, 7, 7, 6.5, 5.5, 4.5, 3.5, 2.5, 2, 1.5,
];
const BINS = ["557910", "415231", "491566", "520488", "455512", "537830", "406004"];
const MOTIVOS: [[string, string], number][] = [
  [["51", "Fondos insuficientes"], 37],
  [["05", "No aprobar"], 20],
  [["55", "NIP incorrecto"], 15],
  [["61", "Excede límite de monto"], 11],
  [["54", "Tarjeta vencida"], 8],
  [["91", "Emisor no disponible"], 5],
  [["14", "Tarjeta inválida"], 4],
];
const OPERACIONES_ATM: [string, number, number][] = [
  ["RETIRO", 45, 0.961],
  ["CONSULTA", 20, 0.978],
  ["SURCHARGE", 25, 1],
  ["TAE", 6, 0.884],
  ["DONATIVO", 4, 0.992],
];

interface Contexto {
  r: Aleatorio;
  catalogo: CatalogoRaw;
  pans: string[];
  secuencia: number;
}

const montoATM = (r: Aleatorio, op: string): number => {
  switch (op) {
    case "RETIRO":
      return entero(r, 2, 50) * 100;
    case "CONSULTA":
      return 0;
    case "SURCHARGE":
      return entero(r, 25, 37);
    case "TAE":
      return entero(r, 2, 30) * 50;
    default:
      return entero(r, 1, 10) * 10;
  }
};

const archivosPorEtapa = (canal: "POS" | "ATM", origen: string | undefined, ts: number) => {
  const f = compacta(ts);
  const f1 = compacta(ts + DIA);
  const f2 = compacta(ts + 2 * DIA);
  const intercambio = { source: "Intercambio", file: `INTX_${f2}_A.dat` };
  const envio = { source: "Envío", file: `ENV_${f2}.out` };
  if (canal === "ATM") {
    return {
      AUT: { source: "TLF", file: `TLF_${f}.dat` },
      COMP: { source: "STATS", file: `STATS_${f}.dat` },
      LIQ: { source: "SETL", file: `SETL_${f}.txt` },
      INT: intercambio,
      ENV: envio,
    };
  }
  const aut =
    origen === "ARCHIVO"
      ? { source: "Archivo TEF", file: `TEF_${f}_01.dat` }
      : origen === "PAPEL"
        ? { source: "Fuente papel", file: `PAP_${f}_01.csv` }
        : { source: "Online (switch)" };
  return {
    AUT: aut,
    COMP: { source: "Compensación POS", file: `COMP_${f1}_01.dat` },
    LIQ: { source: "Liquidación", file: `LIQ_${f}.txt` },
    INT: intercambio,
    ENV: envio,
  };
};

type Estatus = EtapaRaw["status"];

const construirEtapas = (
  archivos: ReturnType<typeof archivosPorEtapa>,
  estados: Record<EtapaRaw["stage"], Estatus>,
): EtapaRaw[] =>
  (["AUT", "COMP", "LIQ", "INT", "ENV"] as const).map((stage) => ({
    stage,
    status: estados[stage],
    ...archivos[stage],
  }));

function crearTransaccion(
  ctx: Contexto,
  canal: "POS" | "ATM",
  ts: number,
  forzarSinAutorizacion = false,
): TransaccionRaw {
  const { r } = ctx;
  ctx.secuencia += 1;
  const adquirente = ctx.catalogo.acquirers[Math.floor(r() * ctx.catalogo.acquirers.length)]!;
  const emisor = ctx.catalogo.issuers[Math.floor(r() * ctx.catalogo.issuers.length)]!;
  const tipo: "D" | "C" = r() < 0.64 ? "D" : "C";
  const edad = (AHORA_SIMULADO - ts) / DIA;

  let monto: number;
  let aprobada: boolean;
  let circuit: string | undefined;
  let origin: string | undefined;
  let atmOp: string | undefined;
  if (canal === "POS") {
    monto = Number((35 + Math.pow(r(), 2.6) * 6500).toFixed(2));
    circuit = ponderado(r, [
      ["LOCAL", 49],
      ["SALIENTE", 20],
      ["ENTRANTE", 17],
      ["INTERREDES", 9],
      ["INTERNACIONAL", 5],
    ]);
    origin = forzarSinAutorizacion
      ? "ONLINE"
      : ponderado(r, [
          ["ONLINE", 80],
          ["ARCHIVO", 15],
          ["PAPEL", 5],
        ]);
    aprobada = forzarSinAutorizacion || r() < 0.935;
  } else {
    const op = ponderado(
      r,
      OPERACIONES_ATM.map(([o, w]) => [o, w] as [string, number]),
    );
    atmOp = op;
    monto = montoATM(r, op);
    aprobada = r() < OPERACIONES_ATM.find(([o]) => o === op)![2];
  }

  const tx: TransaccionRaw = {
    tx_id: `TX-${compacta(ts)}-${pad(ctx.secuencia, 8)}`,
    channel: canal,
    ts: new Date(ts).toISOString(),
    acquirer_name: adquirente.name,
    acquirer_id: adquirente.id,
    issuer_name: emisor.name,
    issuer_id: emisor.id,
    merchant_id: adquirente.merchants[Math.floor(r() * adquirente.merchants.length)]!,
    pan: ctx.pans[Math.floor(r() * ctx.pans.length)]!,
    reference: `7${digitos(r, 22)}`,
    auth_code: aprobada ? alfanum(r, 6) : "",
    card_type: tipo,
    amount: monto,
    mti: origin === "ARCHIVO" || origin === "PAPEL" ? "220" : "210",
    dc: r() < 0.72 ? "DC01" : "DC00",
    original_file: "",
    approved: aprobada,
    stages: [],
    ...(circuit ? { circuit } : {}),
    ...(origin ? { origin } : {}),
    ...(atmOp ? { atm_op: atmOp } : {}),
  };

  const archivos = archivosPorEtapa(canal, origin, ts);
  tx.original_file = forzarSinAutorizacion
    ? archivos.COMP.file
    : ((archivos.AUT as { file?: string }).file ?? `AUTH_ONLINE_${compacta(ts)}.log`);
  if (!aprobada) {
    const [codigo, descripcion] = ponderado(r, MOTIVOS);
    tx.reject_code = codigo;
    tx.reject_desc = descripcion;
    tx.stages = construirEtapas(archivos, {
      AUT: "ERR",
      COMP: "NA",
      LIQ: "NA",
      INT: "NA",
      ENV: "NA",
    });
    return tx;
  }

  const estados: Record<EtapaRaw["stage"], Estatus> = {
    AUT: "OK",
    COMP: "OK",
    LIQ: "OK",
    INT: "OK",
    ENV: "OK",
  };
  const plazo = tipo === "D" ? 30 : 120;
  const x = r();

  if (forzarSinAutorizacion) {
    estados.AUT = "ERR";
    tx.issue = "COMPENSADA_SIN_AUTORIZACION";
  } else if (edad < 1) {
    estados.COMP = "PEND";
  } else if (canal === "POS" && x < 0.012) {
    estados.COMP = edad >= plazo ? "ERR" : "PEND";
    tx.issue = "AUTORIZADA_SIN_COMPENSAR";
  } else if (canal === "POS" && x < 0.033) {
    estados.COMP = "ERR";
    tx.issue = "DISCREPANCIA_IMPORTE";
    tx.cleared_amount = Number((monto * (0.88 + r() * 0.1)).toFixed(2));
  } else if (canal === "ATM" && x < 0.012) {
    estados.COMP = "ERR";
    tx.issue = "SIN_MATCH_TLF_STATS";
  }

  const compOk = estados.COMP === "OK";
  const y = r();
  if (!compOk || edad < 2 || (canal === "ATM" && dia(ts) === FECHA_SETL_FALTANTE))
    estados.LIQ = "PEND";
  else if (y < 0.004 && !tx.issue) {
    estados.LIQ = "ERR";
    tx.issue = "INCONSISTENCIA_LIQUIDACION";
  }

  const z = r();
  if (estados.LIQ !== "OK" || edad < 3) {
    estados.INT = "PEND";
    estados.ENV = "PEND";
  } else if (z < 0.004 && !tx.issue) {
    estados.INT = "ERR";
    estados.ENV = "PEND";
    tx.issue = "RECHAZO_INTERCAMBIO";
  } else if (z < 0.007 && !tx.issue) {
    estados.ENV = "ERR";
    tx.issue = "FALLO_ENVIO";
  }

  // Tiempo máximo de vida: sin match al expirar el plazo de presentación → vencida.
  const w = r();
  if (!tx.issue && edad >= plazo && w < 0.012) {
    estados.LIQ = "ERR";
    estados.INT = "NA";
    estados.ENV = "NA";
    tx.issue = "PLAZO_VENCIDO";
  }
  if (w > 0.985 && !tx.issue) tx.mti = "420";

  tx.stages = construirEtapas(archivos, estados);

  if (canal === "POS") {
    tx.posting = edad >= 1 && compOk ? "OK" : "PEND";
    tx.deposit = edad >= 2 && estados.LIQ === "OK" ? "OK" : "PEND";
    if (r() < 0.004) tx.claim = edad > 10 ? "RESOLVED" : "OPEN";
  }
  return tx;
}

const horaDelDia = (r: Aleatorio, esHoy: boolean): number => {
  const pesos: [number, number][] = PESOS_HORA.map((w, h) => [h, esHoy && h > 9 ? 0 : w]);
  const hora = ponderado(r, pesos);
  const minutoMax = esHoy && hora === 9 ? 39 : 59;
  return hora * 60 + entero(r, 0, minutoMax);
};

function generarTransacciones(ctx: Contexto): TransaccionRaw[] {
  const { r } = ctx;
  const lista: TransaccionRaw[] = [];
  for (let d = DIAS_GENERADOS - 1; d >= 0; d -= 1) {
    const inicio = HOY - d * DIA;
    const semana = new Date(inicio).getUTCDay();
    const factor = semana === 0 ? 0.72 : semana === 6 ? 0.86 : 1;
    let pos = entero(r, 33, 43) * factor;
    let atm = entero(r, 19, 25) * factor;
    if (d === 0) {
      pos *= 0.3;
      atm *= 0.3;
    }
    if (d === 4) pos *= 0.62;
    const delDia: TransaccionRaw[] = [];
    const agregar = (canal: "POS" | "ATM", forzar = false) =>
      delDia.push(
        crearTransaccion(
          ctx,
          canal,
          inicio + horaDelDia(r, d === 0) * 60_000 + entero(r, 0, 59) * 1000,
          forzar,
        ),
      );
    for (let i = 0; i < Math.round(pos); i += 1) agregar("POS");
    for (let i = 0; i < Math.round(atm); i += 1) agregar("ATM");
    if (d >= 1 && r() < 0.55) agregar("POS", true);
    lista.push(...delDia.sort((a, b) => a.ts.localeCompare(b.ts)));
  }
  return lista;
}

function agregarDuplicados(ctx: Contexto, lista: TransaccionRaw[]): void {
  const { r } = ctx;
  const candidatas = lista.filter(
    (t) =>
      t.channel === "POS" &&
      t.origin === "ARCHIVO" &&
      t.approved &&
      !t.issue &&
      (AHORA_SIMULADO - Date.parse(t.ts)) / DIA >= 2,
  );
  const paso = Math.max(1, Math.floor(candidatas.length / 8));
  for (let i = 0; i < 8 && i * paso < candidatas.length; i += 1) {
    const original = candidatas[i * paso]!;
    const ts = Date.parse(original.ts);
    const f = compacta(ts);
    const llave = `PET-${alfanum(r, 4)}-${f}-${pad(entero(r, 0, 9999), 4)}`;
    const recepcion = Date.UTC(
      new Date(ts).getUTCFullYear(),
      new Date(ts).getUTCMonth(),
      new Date(ts).getUTCDate() + 1,
      1,
      entero(r, 5, 55),
    );
    const recepcionDup = recepcion + entero(r, 120, 180) * 60_000;
    const idDup = `TX-${f}-9${pad(i + 1, 7)}`;
    original.dup = {
      pet_key: llave,
      role: "ORIGINAL",
      peer_id: idDup,
      file: `TEF_${f}_01.dat`,
      line: entero(r, 12, 480),
      received_at: new Date(recepcion).toISOString(),
    };
    const duplicado: TransaccionRaw = {
      ...original,
      tx_id: idDup,
      issue: "DUPLICADO",
      original_file: `TEF_${f}_02.dat`,
      dup: {
        pet_key: llave,
        role: "DUPLICADO",
        peer_id: original.tx_id,
        file: `TEF_${f}_02.dat`,
        line: entero(r, 12, 480),
        received_at: new Date(recepcionDup).toISOString(),
      },
      posting: "PEND",
      deposit: "PEND",
      stages: original.stages.map((s) => {
        if (s.stage === "AUT") return { ...s, file: `TEF_${f}_02.dat` };
        if (s.stage === "COMP") return { ...s, status: "ERR" };
        return { ...s, status: "NA" };
      }),
    };
    delete duplicado.claim;
    lista.splice(lista.indexOf(original) + 1, 0, duplicado);
  }
}

const REGLAS_NEGOCIO: Record<
  string,
  {
    tipo: string;
    grupo: string;
    severidad: AlertaRaw["severity"];
    etapa: string;
    stage: EtapaRaw["stage"];
    retrasoH: number;
  }
> = {
  AUTORIZADA_SIN_COMPENSAR: {
    tipo: "Autorizada sin compensar",
    grupo: "Transacciones sin match",
    severidad: "MEDIUM",
    etapa: "Compensación",
    stage: "COMP",
    retrasoH: 31,
  },
  DISCREPANCIA_IMPORTE: {
    tipo: "Discrepancia de importe",
    grupo: "Discrepancias de importes",
    severidad: "HIGH",
    etapa: "Compensación",
    stage: "COMP",
    retrasoH: 31,
  },
  SIN_MATCH_TLF_STATS: {
    tipo: "Sin match TLF vs. STATS",
    grupo: "Transacciones sin match",
    severidad: "MEDIUM",
    etapa: "Compensación",
    stage: "COMP",
    retrasoH: 31,
  },
  COMPENSADA_SIN_AUTORIZACION: {
    tipo: "Compensada sin autorización previa",
    grupo: "Transacciones sin match",
    severidad: "HIGH",
    etapa: "Autorización",
    stage: "COMP",
    retrasoH: 31,
  },
  INCONSISTENCIA_LIQUIDACION: {
    tipo: "Inconsistencia en liquidación",
    grupo: "Transacciones sin match",
    severidad: "MEDIUM",
    etapa: "Liquidación",
    stage: "LIQ",
    retrasoH: 56,
  },
  RECHAZO_INTERCAMBIO: {
    tipo: "Rechazo en intercambio",
    grupo: "Transacciones sin match",
    severidad: "MEDIUM",
    etapa: "Intercambio",
    stage: "INT",
    retrasoH: 82,
  },
  FALLO_ENVIO: {
    tipo: "Fallo en envío de archivo",
    grupo: "Fallos de ejecución",
    severidad: "HIGH",
    etapa: "Envío de archivo",
    stage: "ENV",
    retrasoH: 82,
  },
  PLAZO_VENCIDO: {
    tipo: "Plazo de presentación vencido sin match",
    grupo: "Transacciones sin match",
    severidad: "HIGH",
    etapa: "Liquidación",
    stage: "LIQ",
    retrasoH: 24 * 30,
  },
  DUPLICADO: {
    tipo: "Registro duplicado en archivo TEF",
    grupo: "Duplicados",
    severidad: "HIGH",
    etapa: "Recepción TEF",
    stage: "AUT",
    retrasoH: 0,
  },
};

const ALERTAS_TECNICAS: Omit<AlertaRaw, "alert_id" | "category">[] = [
  {
    group: "Archivos esperados no recibidos",
    type: "Archivo SETL no recibido",
    stage: "Liquidación",
    source: "SETL_20260924.txt",
    ts: "2026-09-25T07:00:00.000Z",
    severity: "HIGH",
    status: "OPEN",
  },
  {
    group: "Retrasos de pipelines",
    type: "ETL de compensación cerca del límite SLA",
    stage: "Compensación",
    source: "Cloud Composer · dag_compensacion",
    ts: "2026-09-25T08:15:00.000Z",
    severity: "MEDIUM",
    status: "OPEN",
  },
  {
    group: "Umbrales de rechazo",
    type: "Rechazo TAE por encima del 8%",
    stage: "Autorización",
    source: "Online ATM",
    ts: "2026-09-25T06:15:00.000Z",
    severity: "MEDIUM",
    status: "IN_PROGRESS",
  },
  {
    group: "Rendimiento",
    type: "Latencia p95 de búsqueda mayor a 3 s",
    stage: "Plataforma",
    source: "Cloud Monitoring",
    ts: "2026-09-25T09:12:00.000Z",
    severity: "MEDIUM",
    status: "OPEN",
  },
  {
    group: "Volúmenes anómalos",
    type: "Volumen POS 38% debajo del esperado",
    stage: "Autorización",
    source: "Online POS",
    ts: "2026-09-21T23:50:00.000Z",
    severity: "MEDIUM",
    status: "CLOSED",
  },
  {
    group: "Fallos de pipelines",
    type: "Job de ingesta TEF falló y se reintentó",
    stage: "Recepción TEF",
    source: "Dataflow · ingest_tef",
    ts: "2026-09-23T08:02:00.000Z",
    severity: "HIGH",
    status: "CLOSED",
  },
  {
    group: "Procesos ETL",
    type: "Registros rechazados por formato",
    stage: "Compensación",
    source: "COMP_20260922_01.dat",
    ts: "2026-09-22T04:31:00.000Z",
    severity: "LOW",
    status: "CLOSED",
  },
  {
    group: "Eventos técnicos",
    type: "Reinicio de instancia de la API",
    stage: "Plataforma",
    source: "Cloud Run · api-monitor",
    ts: "2026-09-24T22:10:00.000Z",
    severity: "LOW",
    status: "CLOSED",
  },
  {
    group: "Fallos de ejecución",
    type: "Motor de match terminó con error",
    stage: "Match",
    source: "Cloud Composer · dag_match",
    ts: "2026-09-19T08:40:00.000Z",
    severity: "HIGH",
    status: "CLOSED",
  },
];

function generarAlertas(r: Aleatorio, transacciones: TransaccionRaw[]): AlertaRaw[] {
  const negocio: Omit<AlertaRaw, "alert_id">[] = [];
  for (const t of transacciones) {
    if (!t.issue) continue;
    const regla = REGLAS_NEGOCIO[t.issue]!;
    const etapa = t.stages.find((s) => s.stage === regla.stage);
    const base =
      t.issue === "DUPLICADO" && t.dup
        ? Date.parse(t.dup.received_at) + 10 * 60_000
        : Date.parse(t.ts) + regla.retrasoH * 3_600_000;
    const ts = Math.min(base, AHORA_SIMULADO - 5 * 60_000);
    const edad = (AHORA_SIMULADO - ts) / DIA;
    const vencida = t.issue === "AUTORIZADA_SIN_COMPENSAR" && etapa?.status === "ERR";
    const status: AlertaRaw["status"] =
      edad > 7
        ? r() < 0.9
          ? "CLOSED"
          : "IN_PROGRESS"
        : edad >= 2
          ? r() < 0.5
            ? "IN_PROGRESS"
            : "OPEN"
          : "OPEN";
    negocio.push({
      category: "BUSINESS",
      group: regla.grupo,
      type: regla.tipo,
      stage: regla.etapa,
      source: t.issue === "DUPLICADO" ? (t.dup?.file ?? "") : (etapa?.file ?? etapa?.source ?? ""),
      ts: new Date(ts).toISOString(),
      severity: vencida ? "HIGH" : regla.severidad,
      status,
      tx_id: t.tx_id,
    });
  }
  const tecnicas = ALERTAS_TECNICAS.map((a) => ({ ...a, category: "TECH" as const }));
  return [...negocio, ...tecnicas]
    .sort((a, b) => a.ts.localeCompare(b.ts))
    .map((a, i) => ({ ...a, alert_id: `AL-${pad(i + 1, 5)}` }));
}

const PROCESOS: ProcesoRaw[] = [
  { id: "CARGA_ONLINE", name: "Carga de autorizaciones online", kind: "duration", limit_min: 5 },
  { id: "TLF", name: "Recepción archivo TLF", kind: "deadline", limit_min: 6 * 60 },
  { id: "STATS", name: "Recepción archivo STATS", kind: "deadline", limit_min: 6 * 60 + 30 },
  { id: "SETL", name: "Recepción archivo SETL", kind: "deadline", limit_min: 7 * 60 },
  { id: "ETL_COMP", name: "ETL de compensación", kind: "duration", limit_min: 45 },
  { id: "MATCH", name: "Motor de match", kind: "duration", limit_min: 30 },
  { id: "DUP_TEF", name: "Detección de duplicados TEF", kind: "duration", limit_min: 10 },
  {
    id: "ENVIO_INT",
    name: "Envío de archivo de intercambio",
    kind: "deadline",
    limit_min: 10 * 60,
  },
];

function generarSLA(r: Aleatorio): EjecucionSLARaw[] {
  const lista: EjecucionSLARaw[] = [];
  for (let d = 13; d >= 0; d -= 1) {
    const fecha = dia(HOY - d * DIA);
    const hoy = d === 0;
    const llegada = (limite: number) =>
      r() < 0.06 ? limite + entero(r, 5, 50) : limite - entero(r, 10, 70);
    const duracion = (limite: number, p50Min: number, p50Max: number) => {
      const p50 = entero(r, p50Min, p50Max);
      const p95 =
        r() < 0.06
          ? Math.round(limite * 1.08)
          : Math.min(Math.round(limite * 0.84), p50 + entero(r, 2, 6));
      return { p50, p95 };
    };
    const carga = duracion(5, 2, 3);
    lista.push({
      process_id: "CARGA_ONLINE",
      date: fecha,
      scheduled_min: 360,
      start_min: 360,
      end_min: 360 + carga.p95,
      ...carga,
    });
    for (const [id, limite] of [
      ["TLF", 360],
      ["STATS", 390],
      ["SETL", 420],
    ] as const) {
      const faltante = hoy && id === "SETL";
      lista.push({
        process_id: id,
        date: fecha,
        scheduled_min: limite,
        ...(faltante ? {} : { arrival_min: llegada(limite) }),
      });
    }
    const inicioEtl = 450 + entero(r, -3, 8);
    const etl = hoy ? { p50: 38, p95: 44 } : duracion(45, 30, 34);
    lista.push({
      process_id: "ETL_COMP",
      date: fecha,
      scheduled_min: 450,
      start_min: inicioEtl,
      end_min: inicioEtl + etl.p95,
      ...etl,
    });
    const inicioMatch = inicioEtl + etl.p95 + 3;
    const match = duracion(30, 15, 20);
    lista.push({
      process_id: "MATCH",
      date: fecha,
      scheduled_min: inicioMatch,
      start_min: inicioMatch,
      end_min: inicioMatch + match.p95,
      ...match,
    });
    const dup = duracion(10, 5, 6);
    lista.push({
      process_id: "DUP_TEF",
      date: fecha,
      scheduled_min: 485,
      start_min: 485,
      end_min: 485 + dup.p95,
      ...dup,
    });
    lista.push({
      process_id: "ENVIO_INT",
      date: fecha,
      scheduled_min: 600,
      ...(hoy ? {} : { arrival_min: llegada(600) }),
    });
  }
  return lista;
}

function generarRecepciones(): RecepcionRaw[] {
  const lista: RecepcionRaw[] = [];
  for (let d = DIAS_GENERADOS - 1; d >= 1; d -= 1) {
    const fecha = dia(HOY - d * DIA);
    for (const source of ["TLF", "STATS", "SETL", "COMP_POS", "TEF", "EPAPE"] as const) {
      const faltante =
        (source === "SETL" && fecha === FECHA_SETL_FALTANTE) ||
        (source === "EPAPE" && fecha === FECHA_EPAPE_FALTANTE);
      lista.push({ source, data_date: fecha, received: !faltante });
    }
  }
  return lista;
}

function generarParametros(): ParametroRaw[] {
  return [
    {
      key: "plazo_debito",
      group: "deadline",
      label: "Plazo de presentación débito",
      unit: "days",
      value: 30,
      min: 1,
      max: 365,
    },
    {
      key: "plazo_credito",
      group: "deadline",
      label: "Plazo de presentación crédito",
      unit: "days",
      value: 120,
      min: 1,
      max: 365,
    },
    {
      key: "meta_match",
      group: "match_goal",
      label: "Meta de Match online vs. compensación",
      unit: "pct",
      value: 98,
      min: 50,
      max: 100,
    },
    {
      key: "umbral_rechazo",
      group: "alert_threshold",
      label: '% de rechazo que dispara "Umbrales de rechazo"',
      unit: "pct",
      value: 8,
      min: 0,
      max: 100,
    },
    {
      key: "umbral_volumen",
      group: "alert_threshold",
      label: '% de desviación de volumen que dispara "Volúmenes anómalos"',
      unit: "pct",
      value: 30,
      min: 0,
      max: 100,
    },
    ...PROCESOS.map((p) => ({
      key: `sla_${p.id.toLowerCase()}`,
      group: "sla_limit" as const,
      label:
        p.kind === "deadline"
          ? `${p.name} (hora límite, min desde 00:00)`
          : `${p.name} (duración máxima)`,
      unit: "min" as const,
      value: p.limit_min,
      min: 1,
      max: 1440,
    })),
  ];
}

/** Nombres ficticios fijos (no corresponden a bancos reales). */
const NOMBRES_ADQUIRENTES = [
  "Banco Altavista",
  "Grupo Financiero Meridiano",
  "Banco Trébol",
  "Financiera Rumbo",
  "Banco del Istmo",
  "Banco Ventura",
];
const NOMBRES_EMISORES = [
  "Banco Noreste",
  "Grupo Financiero Cumbre",
  "Banco Capital Azul",
  "Financiera Horizonte",
  "Banco Sureste",
  "Caja Popular Unión",
  "Banco Puente",
];

function generarCatalogo(r: Aleatorio): { catalogo: CatalogoRaw; pans: string[] } {
  const acquirers = NOMBRES_ADQUIRENTES.map((name) => ({
    id: digitos(r, 11),
    name,
    merchants: Array.from({ length: 7 }, () => digitos(r, 7)),
  }));
  const issuers = NOMBRES_EMISORES.map((name) => ({ id: digitos(r, 11), name }));
  const pans = Array.from(
    { length: 420 },
    () => `${BINS[Math.floor(r() * BINS.length)]!}${pad(Math.floor(r() * 1e10), 10)}`,
  );
  return { catalogo: { acquirers, issuers }, pans };
}

export function generarDataset(semilla: number = SEMILLA): DatasetRaw {
  const r = crearAleatorio(semilla);
  const { catalogo, pans } = generarCatalogo(r);
  const ctx: Contexto = { r, catalogo, pans, secuencia: 0 };
  const transacciones = generarTransacciones(ctx);
  agregarDuplicados(ctx, transacciones);
  return {
    transacciones,
    alertas: generarAlertas(r, transacciones),
    procesos: PROCESOS,
    ejecuciones: generarSLA(r),
    recepciones: generarRecepciones(),
    catalogo,
    parametros: generarParametros(),
  };
}

let cache: DatasetRaw | null = null;

export const datasetRaw = (): DatasetRaw => {
  cache ??= generarDataset();
  return cache;
};
