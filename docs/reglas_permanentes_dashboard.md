# Reglas Permanentes para Lovable — Clean Architecture, SOLID y Coverage >94%

Este documento es un **set de reglas obligatorias** para que Lovable construya y modifique la plataforma **Dashboard de Monitoreo y Conciliación Transaccional — Dashboard Ejecutivo, Dashboard de SLA, Consulta de Operaciones y Módulo de Alertas** sin degradar calidad.
No es un plan; es un **contrato de ejecución**. Se usa junto con el documento `frontend_dashboard_spec.md` (Knowledge Base del proyecto) — ese define _qué_ se construye, este define _cómo_ se construye siempre.

## 0) Regla Cero: No romper la arquitectura

- Nunca introducir lógica de negocio en `presentation/` (UI, componentes, páginas).
- Nunca llamar repositorios mock, HTTP o SDKs directamente desde componentes UI — siempre a través de un hook de presentación que consuma un caso de uso.
- Todo cambio debe ubicarse explícitamente en una capa: `domain`, `application`, `infrastructure`, `presentation`.

## 1) Regla de Capas: dónde vive cada cosa

**Domain**

- Solo: entidades (`Transaccion`, `IndicadorEjecutivo`, `IndicadorSLA`, `Alerta`, `ConfiguracionAlertas`), value objects, interfaces de repositorios, errores tipados, Result.
- Prohibido: dependencias a frameworks (React, clientes HTTP, SDKs de terceros).

**Application**

- Solo: casos de uso, orquestación de reglas de negocio, servicios de aplicación.
- Prohibido: UI, detalles de infraestructura (fetch directo, acceso a fixtures, futuro cliente de API/Supabase).

**Infrastructure**

- Solo: implementaciones concretas (repositorios mock hoy, repositorios HTTP/Supabase mañana), mappers, fixtures.
- Prohibido: reglas de negocio (solo "cómo se obtiene/transforma el dato").

**Presentation**

- Solo: componentes, pages, hooks que llaman casos de uso.
- Prohibido: decisiones del negocio (ej. "si el resultado excede el límite, bloquear exportación"), eso vive en use cases.

## 2) Regla SOLID: toda fuente de datos va detrás de interfaces

- Cada fuente de datos (mock hoy; API real, Supabase o cualquier backend mañana) requiere:
  - Interface en `domain/repositories` (`ITransaccionRepository`, `IDashboardRepository`, `IAlertaRepository`)
  - Implementación en `infrastructure/repositories/*`
- Se permite cambiar de mock a backend real **sin tocar** domain/app (solo infra).

## 3) Regla SRP: un archivo, una responsabilidad

- Un hook de presentación no debe: pedir datos + calcular + formatear + exportar + notificar, todo junto.
- Separar en:
  - `UseCase` (decide: buscar operaciones, exportar CSV, actualizar configuración de alertas)
  - `Repository` (datos: transacciones, indicadores, alertas)
  - `Service` (transversal: `FormatoExportacionService`)
  - Hook de presentación (coordina UI: `useIndicadoresEjecutivos`, `useConsultaOperaciones`)

## 4) Regla de Result Pattern: sin throws genéricos

- Domain y Application **no lanzan** errores genéricos.
- Domain y Application devuelven `Result<T>` y errores tipados.
- Infrastructure puede capturar errores del origen de datos y mapearlos a errores tipados o `Result`.

## 5) Regla DTO + Mapper: límites limpios

- Todo dato que cruce la frontera entre `infrastructure` y el resto de la app usa un mapper.
- Toda transformación dato-crudo ⇄ Entity ocurre en `infrastructure/mappers/*` (`TransaccionMapper`, `IndicadorMapper`, `AlertaMapper`).
- UI nunca consume registros crudos del mock ni, en el futuro, payloads crudos de una API; consume entidades del dominio.

## 6) Regla DI (DIP): dependencias por inyección

- Repositorios y servicios se entregan por un `DependencyProvider` (context) definido en `infrastructure/di/container.ts`.
- UI consume dependencias vía contexto o hooks de DI.
- Prohibido crear instancias de repositorios directamente dentro de componentes.

## 7) Regla de Repositorios: Thin Adapter obligatorio

En `infrastructure/repositories/*`:

- Cada repositorio debe ser thin: recibir parámetros → obtener datos (mock hoy, API mañana) → mapear con su mapper → devolver `Result`.
- Prohibido: lógica de negocio dentro de un repositorio (ej. decidir si una operación "cuenta" como incumplimiento de SLA — eso es un caso de uso).
- Los fixtures de `infrastructure/mock/data` deben tener volumen y variedad suficiente para probar estados reales: resultados vacíos, las 4 severidades de alerta, al menos un incumplimiento de SLA por etapa.

## 8) Regla de Seguridad: no exponer datos ni credenciales sensibles

- Los fixtures mock no deben incluir datos personales o de negocio reales — solo datos sintéticos representativos.
- Cuando exista integración real (API/Supabase/backend), las credenciales viven exclusivamente en variables de entorno del backend, nunca en el bundle del frontend.
- La UI muestra errores "seguros" (mensaje claro para el usuario, sin detalles internos ni stack traces).

## 9) Regla de Coverage: >94% SIEMPRE

- Cada cambio debe incluir tests suficientes para mantener:
  - branches ≥ 94
  - functions ≥ 94
  - lines ≥ 94
  - statements ≥ 94
- Si el cambio baja coverage, debe agregarse el set de tests correspondiente antes de "finalizar".

## 10) Regla de Pruebas por Capa

- Domain: unit tests (target 100%). Ejemplos: `Transaccion`, `IndicadorSLA`, errores tipados.
- Application: unit + integration (repos fake in-memory). Ejemplos: `BuscarOperacionesUseCase`, `ExportarOperacionesCSVUseCase`, `ActualizarConfiguracionAlertasUseCase`.
- Infrastructure: integration tests / contract tests. Ejemplos: `MockTransaccionRepository`, `TransaccionMapper`.
- Presentation: component/integration (Testing Library). Ejemplos: `DashboardEjecutivoPage`, `SemaforoBadge`, `drill-down-panel`.
- Backend/Edge Functions: no aplica en esta fase del proyecto (solo frontend); si se agrega backend propio más adelante, este documento se actualiza con esa capa.

## 11) Regla de "No Quick Fixes"

- Prohibido resolver bugs con:
  - duplicación de lógica de cálculo de KPIs o de umbrales de SLA en un componente de UI
  - ifs dispersos en hooks para decidir severidad de alerta o límite de exportación
  - llamados directos a fixtures o a una futura API desde componentes
- Todo bug se resuelve en su capa correcta y con test.

## 12) Regla de Cambios: checklist obligatorio antes de entregar

Para cada feature/cambio, Lovable debe producir:

1. **Clasificación de capa** (domain/app/infra/presentation)
2. **Interfaces/contratos** (si hay una nueva fuente de datos)
3. **Casos de uso** (si hay decisión de negocio: buscar, exportar, marcar leída, actualizar configuración)
4. **Repositorios/mappers** (si hay datos nuevos o cambia el formato del mock)
5. **Hooks/UI** (solo consumo de use cases)
6. **Tests** (mínimo por capa afectada)
7. **Verificación coverage** (no aceptar <94%)
8. **Manejo de errores** con Result + errores tipados (`RangoFechasInvalidoError`, `TransaccionNoEncontradaError`, `LimiteExportacionExcedidoError`, `ConfiguracionAlertaInvalidaError`)

## 13) Regla de Nomenclatura y Ubicación

- `*UseCase.ts` solo en `application/useCases/*`
- `I*Repository.ts` solo en `domain/repositories/*`
- `*Repository.ts` concreto solo en `infrastructure/repositories/*`
- `*Mapper.ts` solo en `infrastructure/mappers/*`
- `use*.ts` (hooks de presentación) solo en `presentation/hooks/*`
- Componentes compartidos (ej. `drill-down-panel`, `semaforo-badge`, `kpi-card`) solo en `presentation/components/*`

## 14) Regla de Evolución: cambiar el origen de datos sin dolor

Cuando el proyecto pase de datos mock a un backend real (API propia, Supabase, u otro):

- SOLO se modifica `infrastructure/repositories/*` (se agregan las implementaciones reales cumpliendo las interfaces existentes) y `infrastructure/di/container.ts`
- NO se toca `domain` ni `application`
- Los tests de `application` y `presentation` deben seguir pasando sin modificación, porque siguen probando contra las mismas interfaces

## 15) Regla Final: si hay duda, se elige la opción más mantenible

Si hay dos formas de construir:

- elegir la que respete capas, contratos, tests y DI
- aunque tome más archivos
- aunque sea menos "rápida"

---

## Instrucción para pegar en Lovable (resumen ultra corto)

"Antes de escribir código: identifica la capa, define interfaz/use case, implementa infra con mapper, conecta vía hook de presentación, escribe tests y valida coverage >94%. No quick fixes."
