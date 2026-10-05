# Knowledge Base — Principios de Calidad (Clean Architecture, SOLID, SonarQube >94%)

Este documento se usa como **Knowledge** en Lovable para asegurar que **todo lo que generemos** (código, estructura, hooks, tests y refactors) respete los principios de calidad de la plataforma **Plataforma de Monitoreo y Conciliación Transaccional — Dashboards Ejecutivo, SLA, Consulta de Operaciones y Alertas**.

## Objetivo

Mantener el proyecto **enterprise-ready** y fácil de evolucionar, con:

- **Clean Architecture** (dominio / aplicación / infraestructura / presentación)
- **SOLID** con interfaces y abstracciones reales
- **Cobertura de pruebas global >94%** (SonarQube + Vitest)
- Manejo de errores estandarizado (Result pattern + errores tipados)
- DTOs + Mappers para transformación de datos
- Repositorios "thin adapters" (mock hoy, API/Supabase real después) + validadores
- CI con thresholds que rompan el build si baja la calidad

## Estado actual (problema)

Este es un proyecto **nuevo, arrancando desde cero** en Lovable, solo frontend por ahora (sin backend real conectado todavía). El riesgo que este documento previene es que, al construirse rápido dentro de Lovable, termine con:

- Componentes que llaman datos "a mano" sin separación de capas (dominio, aplicación, infraestructura)
- Sin interfaces/abstracciones — imposible cumplir SOLID ni sustituir el mock por una API real sin reescribir pantallas
- Cero tests unitarios
- Manejo de errores inconsistente (try/catch sueltos, sin tipos)
- Sin DTOs ni mappers entre la capa de datos y la UI
- Sin reglas de cobertura ni calidad configuradas

## Contexto del sistema

La plataforma da seguimiento de extremo a extremo al ciclo de vida de las transacciones procesadas por un switch de pagos: desde su autorización hasta su compensación, liquidación y, en su caso, aclaración. Sustituye la revisión manual mediante consultas SQL por una capa analítica y de consulta unificada, con visibilidad proactiva sobre volumen, integridad y tiempos de procesamiento.

Este entregable cubre **solo el frontend**, con cuatro módulos: **Dashboard Ejecutivo**, **Dashboard de SLA**, **Consulta de Operaciones** y **Módulo de Alertas**. La fuente de datos es una capa mock desacoplada (patrón Repository); cuando exista backend real, se conecta sin tocar dominio, aplicación ni presentación.

### Stack tecnológico

| Capa                          | Tecnología                                                                                    |
| ----------------------------- | --------------------------------------------------------------------------------------------- |
| Frontend + orquestador        | Lovable (React 18 + TypeScript estricto)                                                      |
| Build tool                    | Vite                                                                                          |
| Estilos                       | Tailwind CSS + shadcn/ui                                                                      |
| Ruteo                         | React Router v6                                                                               |
| Estado de servidor / cache    | TanStack Query (consumido igual aunque el origen sea mock)                                    |
| Estado de UI local            | Zustand                                                                                       |
| Gráficas                      | Recharts                                                                                      |
| Formularios/filtros           | React Hook Form + Zod                                                                         |
| Origen de datos (fase actual) | Repositorios mock con fixtures (`infrastructure/mock`)                                        |
| Origen de datos (fase futura) | API real / Supabase — se conecta implementando las mismas interfaces de `domain/repositories` |
| Testing                       | Vitest + React Testing Library + `@testing-library/user-event`                                |
| Calidad                       | SonarQube + `eslint-plugin-boundaries` para forzar límites entre capas                        |

---

## Arquitectura propuesta

### Frontend — Clean Architecture simplificada

Estructura objetivo:

```
src/
├── domain/
│   ├── entities/
│   │   ├── Transaccion.ts
│   │   ├── IndicadorEjecutivo.ts
│   │   ├── IndicadorSLA.ts
│   │   ├── Alerta.ts
│   │   └── ConfiguracionAlertas.ts
│   ├── repositories/
│   │   ├── ITransaccionRepository.ts
│   │   ├── IDashboardRepository.ts
│   │   └── IAlertaRepository.ts
│   └── errors/
│       └── DomainErrors.ts
│
├── application/
│   ├── useCases/
│   │   ├── dashboard/
│   │   │   ├── ObtenerIndicadoresEjecutivosUseCase.ts
│   │   │   ├── ObtenerIndicadoresSLAUseCase.ts
│   │   │   └── index.ts
│   │   ├── operaciones/
│   │   │   ├── BuscarOperacionesUseCase.ts
│   │   │   ├── ObtenerDetalleTransaccionUseCase.ts
│   │   │   └── ExportarOperacionesCSVUseCase.ts
│   │   └── alertas/
│   │       ├── ObtenerAlertasUseCase.ts
│   │       ├── MarcarAlertaLeidaUseCase.ts
│   │       └── ActualizarConfiguracionAlertasUseCase.ts
│   └── services/
│       └── FormatoExportacionService.ts
│
├── infrastructure/
│   ├── repositories/
│   │   ├── MockTransaccionRepository.ts
│   │   ├── MockDashboardRepository.ts
│   │   └── MockAlertaRepository.ts
│   ├── mock/
│   │   └── data/                  # fixtures realistas (volumen, casos vacíos, 4 severidades, incumplimientos SLA)
│   ├── mappers/
│   │   ├── TransaccionMapper.ts
│   │   ├── IndicadorMapper.ts
│   │   └── AlertaMapper.ts
│   └── di/
│       └── container.ts           # composition root — aquí se cambia mock por API real
│
├── presentation/
│   ├── components/
│   │   ├── ui/                    # shadcn/ui wrappers
│   │   ├── kpi-card/
│   │   ├── semaforo-badge/
│   │   ├── data-table/
│   │   └── drill-down-panel/      # componente único, reutilizado en Ejecutivo/SLA/Consulta
│   ├── layouts/
│   │   └── AppShell.tsx           # sidebar + topbar + campana de alertas
│   ├── pages/
│   │   ├── DashboardEjecutivoPage.tsx
│   │   ├── DashboardSLAPage.tsx
│   │   ├── ConsultaOperacionesPage.tsx
│   │   └── AlertasPage.tsx
│   ├── routes/
│   │   └── router.tsx
│   └── hooks/
│       ├── useIndicadoresEjecutivos.ts
│       ├── useIndicadoresSLA.ts
│       ├── useConsultaOperaciones.ts
│       └── useAlertas.ts
│
└── shared/
    ├── types/
    ├── utils/
    └── test-utils/                # render() con providers, builders de mocks
```

### Principios SOLID (aplicación práctica)

**SRP**: cada módulo hace una cosa (repositorio accede datos, caso de uso decide, hook de presentación orquesta; un componente no formatea fechas _y_ pinta UI _y_ llama al repositorio).
**OCP**: fuentes de datos siempre detrás de interfaces (`ITransaccionRepository`, `IDashboardRepository`, `IAlertaRepository|`) — agregar una implementación HTTP real no obliga a tocar las existentes.
**LSP**: cualquier implementación de `ITransaccionRepository` (mock u HTTP futura) debe ser intercambiable sin romper a quien la consume — se valida con un contract-test compartido.
**ISP**: en vez de un repositorio "Dios", se separan `IDashboardRepository`, `ITransaccionRepository` e `IAlertaRepository`; cada hook consume solo lo que necesita.
**DIP**: `application` y `presentation` dependen de interfaces (`domain/repositories`), nunca de clases concretas de `infrastructure`. La inyección ocurre en `infrastructure/di/container.ts`.

Ejemplo de interfaz (OCP):

```ts
export interface ITransaccionRepository {
  buscar(filtros: FiltrosOperaciones): Promise<Result<{ items: Transaccion[]; total: number }>>;
  obtenerDetalle(id: string): Promise<Result<Transaccion>>;
}
```

### Inyección de dependencias (DIP)

```ts
const repositories = {
  transaccion: new MockTransaccionRepository(),
  dashboard: new MockDashboardRepository(),
  alerta: new MockAlertaRepository(),
};

const services = {
  formatoExportacion: new FormatoExportacionService(),
};

export const DependencyContext = createContext({ repositories, services });
```

Cuando exista backend real: se crean `HttpTransaccionRepository`, `HttpDashboardRepository`, `HttpAlertaRepository` cumpliendo las mismas interfaces, y solo se reemplaza este objeto `repositories` — nada en `application` ni `presentation` cambia.

---

## Manejo de errores estandarizado

### Result Pattern

```ts
export type Result<T, E = Error> = { success: true; data: T } | { success: false; error: E };
```

### Errores tipados del dominio

```ts
export class RangoFechasInvalidoError extends Error {
  constructor() {
    super("El rango de fechas seleccionado no es válido.");
    this.name = "RangoFechasInvalidoError";
  }
}

export class TransaccionNoEncontradaError extends Error {
  constructor(id: string) {
    super(`No se encontró la transacción ${id}.`);
    this.name = "TransaccionNoEncontradaError";
  }
}

export class LimiteExportacionExcedidoError extends Error {
  constructor(limite: number) {
    super(`La exportación excede el límite de ${limite} registros. Ajusta los filtros.`);
    this.name = "LimiteExportacionExcedidoError";
  }
}

export class ConfiguracionAlertaInvalidaError extends Error {
  constructor(motivo: string) {
    super(`Configuración de alerta inválida: ${motivo}`);
    this.name = "ConfiguracionAlertaInvalidaError";
  }
}
```

Regla: **nunca** lanzar errores "genéricos" desde dominio y aplicación. Siempre devolver `Result` o errores tipados.

---

## Modelo de datos (dominio) y mappers

```ts
// domain/entities/Transaccion.ts
export interface Transaccion {
  id: string;
  canal: "CANAL_A" | "CANAL_B";
  estado: "AUTORIZADA" | "RECHAZADA" | "EN_CONCILIACION" | "SIN_MATCH" | "CONCILIADA";
  importe: number;
  fechaAutorizacion: string; // ISO 8601
  entidadAdquirente: string;
  entidadEmisora: string;
  codigoAutorizacion: string;
  cuenta: string;
  etapas: EtapaTransaccion[];
}

export interface EtapaTransaccion {
  nombre: "COMPENSACION" | "LIQUIDACION" | "ACLARACION" | "INTERCAMBIO" | "MATCH";
  estado: "PENDIENTE" | "COMPLETADA" | "INCUMPLIDA";
  timestamp?: string;
  tiempoTranscurridoMs?: number;
}

// domain/entities/IndicadorEjecutivo.ts
export interface IndicadorEjecutivo {
  clave: "MATCH_SCORE" | "FLOW_SCORE" | "CLEARING_SCORE" | "MTTR" | "DETECCION_PROACTIVA";
  valor: number;
  unidad: "%" | "min" | "seg";
  tendencia: "SUBE" | "BAJA" | "ESTABLE";
}

// domain/entities/IndicadorSLA.ts
export interface IndicadorSLA {
  etapa: EtapaTransaccion["nombre"];
  cumplimiento: "VERDE" | "AMARILLO" | "ROJO";
  latenciaP50Ms: number;
  latenciaP95Ms: number;
  umbralMs: number;
}

// domain/entities/Alerta.ts
export interface Alerta {
  id: string;
  tipo: string;
  severidad: "BAJA" | "MEDIA" | "ALTA" | "CRITICA";
  mensaje: string;
  fecha: string;
  leida: boolean;
}

export interface ConfiguracionAlertas {
  eventosNotificables: string[];
  canal: "CANAL_A" | "CANAL_B" | "AMBOS";
  medio: "APP" | "CORREO" | "AMBOS";
  frecuencia: "INMEDIATA" | "RESUMEN_DIARIO";
}
```

Los mappers (`infrastructure/mappers`) convierten el formato crudo del origen de datos (hoy: fixtures JSON; mañana: respuesta HTTP/Supabase) a estas entidades de dominio — la UI nunca ve el formato crudo, siempre la entidad ya mapeada. Esto es lo que permite cambiar de mock a API real sin tocar `presentation`.

---

## Testing — Coverage global >94%

### Estructura de tests

```
src/
├── domain/entities/__tests__/
├── application/useCases/__tests__/
├── infrastructure/repositories/__tests__/
├── infrastructure/mappers/__tests__/
├── presentation/components/__tests__/
├── presentation/hooks/__tests__/
└── shared/utils/__tests__/
```

### Targets por capa

- Domain: Unit (Vitest) → **100%**
- Application (casos de uso, inyectando repos fake in-memory): Unit + Integration → **95%**
- Infrastructure (mock repos + mappers, contract tests): Integration → **90%**
- Presentation (componentes + hooks, comportamiento visible al usuario: loading/éxito/vacío/error): Component + Integration → **90%**
- Global (Sonar): **>=94%** en branches/functions/lines/statements

Ejemplo test use case (límite de exportación):

```ts
it("should reject export when result exceeds limit", async () => {
  mockRepo.buscar.mockResolvedValue({ success: true, data: { items: [], total: 50000 } });
  const result = await useCase.execute(filtros);
  expect(result.success).toBe(false);
  expect(result.error).toBeInstanceOf(LimiteExportacionExcedidoError);
});
```

Ejemplo test de componente (semáforo SLA):

```ts
it("should render red badge when SLA is breached", () => {
  render(<SemaforoBadge cumplimiento="ROJO" />);
  expect(screen.getByText(/incumplido/i)).toBeInTheDocument();
});
```

---

## Configuración SonarQube y Vitest

### vitest.config.ts (thresholds)

```ts
coverage: {
  provider: "v8",
  reporter: ["text", "lcov", "html"],
  reportsDirectory: "./coverage",
  thresholds: {
    global: {
      branches: 94,
      functions: 94,
      lines: 94,
      statements: 94,
    },
  },
  exclude: [
    "node_modules/**",
    "src/test/**",
    "**/*.d.ts",
    "**/types.ts",
    "src/infrastructure/mock/data/**",
  ],
},
```

### sonar-project.properties

```properties
sonar.projectKey=dashboard-monitoreo-transaccional
sonar.projectName=Dashboard de Monitoreo y Conciliación Transaccional
sonar.sources=src
sonar.tests=src/**/__tests__
sonar.javascript.lcov.reportPaths=coverage/lcov.info
sonar.coverage.exclusions=**/test/**,**/*.test.ts,**/*.test.tsx
sonar.cpd.exclusions=**/types.ts
```

---

## Módulos funcionales (alcance de UI)

- **Dashboard Ejecutivo**: KPIs (match score, flow score, clearing/interchange/settlement score, MTTR, detección proactiva), distribución por canal/estado, tendencia vs. periodo anterior, filtros (fechas/canal/entidad), drill-down en 3 niveles (agregado → conjunto de operaciones → detalle de transacción).
- **Dashboard de SLA**: semáforo de cumplimiento por etapa, tabla con tiempo transcurrido vs. umbral y acción "Investigar", gráfica de latencia p50/p95, mismo componente de drill-down. Mide tiempos/latencia, no plazos de días de presentación (eso es una regla de negocio distinta, fuera de esta pantalla).
- **Consulta de Operaciones**: filtros (fechas, adquirente, emisor, importe, cuenta, código de autorización, canal, filtro "sin match"), tabla con detalle expandible, consulta de etapas, exportación CSV con el límite validado por `LimiteExportacionExcedidoError`.
- **Módulo de Alertas**: campana con contador en `AppShell`, sidebar de alertas recientes, historial de 90 días filtrable por tipo/severidad, pantalla de configuración (eventos, canal, medio, frecuencia) validada por `ConfiguracionAlertaInvalidaError`.

---

## Orden de implementación (roadmap)

**Fase 1 — Base sin backend real (Alta):**

- Crear carpetas domain/application/infrastructure/presentation
- Entidades: `Transaccion`, `IndicadorEjecutivo`, `IndicadorSLA`, `Alerta`, `ConfiguracionAlertas`
- Interfaces de repositorios + Result + errores tipados del dominio
- Config de coverage (Vitest thresholds) desde el primer commit
- `AppShell` + ruteo con las 4 páginas vacías
- Repositorios mock + fixtures con volumen realista (casos vacíos, 4 severidades, al menos un incumplimiento de SLA)

**Fase 2 — Dashboard Ejecutivo + Dashboard de SLA (Alta):**

- `ObtenerIndicadoresEjecutivosUseCase` / `ObtenerIndicadoresSLAUseCase`
- Componente `drill-down-panel` compartido (se reutiliza en Fase 3)
- Tests domain + application (cobertura >94% en esas capas)

**Fase 3 — Consulta de Operaciones (Media):**

- `BuscarOperacionesUseCase`, `ObtenerDetalleTransaccionUseCase`, `ExportarOperacionesCSVUseCase`
- Filtros dinámicos + tabla + export CSV
- Reutilización del `drill-down-panel`
- Tests de integración (mock repos + mappers)

**Fase 4 — Módulo de Alertas + cierre de calidad (Media/Baja):**

- Campana, sidebar, historial, configuración
- Completar coverage hasta >94% en todas las capas
- CI + SonarQube conectados
- Documentación operativa final (este mismo documento, actualizado si cambió algo)

---

## Beneficios esperados

- Código testeable y mantenible
- Cambiar de datos mock a API real no rompe lógica de negocio ni UI
- Tests rápidos y confiables
- Coverage verificable en CI/CD
- Cumplimiento de estándares enterprise, consistente con el resto de los proyectos del equipo

---

## Instrucción operativa para Lovable (regla de ejecución)

Cada vez que se pida crear o modificar algo, Lovable debe:

1. Proponer en qué capa cae el cambio (domain/app/infra/presentation)
2. Definir interfaz y caso de uso antes de tocar UI
3. Implementar mappers/DTOs si hay datos externos o del mock
4. Añadir tests que mantengan coverage >94%
5. Evitar "quick fixes" que rompan SOLID o las separaciones de capas
6. Repositorios: siempre "thin adapters" + fixtures realistas, nunca lógica de negocio dentro del repositorio
7. Proveer snippets listos para Sonar y Vitest si hay cambios estructurales
