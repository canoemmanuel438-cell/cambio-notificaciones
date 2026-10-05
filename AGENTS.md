<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->

## Arquitectura (contrato obligatorio)

Fuente: `docs/frontend_dashboard_spec.md` y `docs/reglas_permanentes_dashboard.md`.

- Clean Architecture en 4 capas bajo `src/`: `domain/`, `application/`, `infrastructure/`, `presentation/`, más `shared/`. Toda adición se ubica explícitamente en una capa — evita lógica dispersa y acoplamiento.
- `domain/` no depende de frameworks (sin React, sin HTTP): mantiene el núcleo testeable y portable.
- Toda fuente de datos vive detrás de una interfaz en `domain/repositories` (`ITransaccionRepository`, `IDashboardRepository`, `IAlertaRepository`) — permite pasar de mock a API real tocando solo infraestructura.
- `application/useCases/*` contiene toda decisión de negocio; `presentation/` solo consume use cases vía hooks — evita reglas duplicadas en la UI.
- Domain y application devuelven `Result<T>` y errores tipados, nunca throws genéricos — hace explícito el manejo de fallos.
- Todo dato cruza de `infrastructure` al resto mediante mappers (`infrastructure/mappers/*`) — la UI nunca ve formato crudo.
- Las dependencias se inyectan desde `infrastructure/di/container.ts` vía contexto; prohibido instanciar repositorios en componentes — garantiza sustituibilidad y tests.
- Repositorios son thin adapters (obtener → mapear → `Result`), sin lógica de negocio.
- Nomenclatura fija: `*UseCase.ts` en application, `I*Repository.ts` en domain, `*Repository.ts`/`*Mapper.ts` en infrastructure, `use*.ts` en `presentation/hooks`.
- Tests con Vitest + Testing Library en `__tests__` por capa; umbral global de cobertura ≥94% en branches/functions/lines/statements — el build falla si baja.
- Ruteo: el proyecto usa TanStack Router con archivos en `src/routes/` (el spec menciona React Router v6, que no aplica aquí). Las rutas son shells delgados que renderizan páginas de `src/presentation/pages/`.

## Monitor POS y ATM (decisiones vigentes)

- Producto actual: "Monitor transaccional POS y ATM" (spec en `docs/prompt_monitor_transaccional_POS_ATM.md`); reemplaza al monitor anterior — el spec manda HTML único, pero rige esta arquitectura por capas.
- Datos: simulador determinista `infrastructure/mock/data/generador.ts` (semilla 20260925, "ahora" 25 sep 2026 09:40) — reglas de generación viven solo ahí, como si fueran el backend.
- Tiempo inyectado vía `Reloj` (`relojes.datos` fijo, `relojes.eventos` para bitácora) — nunca `new Date()` en domain/application, para que los cálculos sean reproducibles.
- Roles y permisos en `domain/entities/Rol.ts`; los casos de uso validan descarga/atención de alertas — la UI solo oculta, no autoriza.
- Sesión demo y estados de alertas persisten en el navegador vía `infrastructure/storage/AlmacenamientoNavegador.ts`; bitácora en memoria por sesión.
- Pruebas: `bun run test` (config `vitest.config.ts`); umbral 94% aplicado a domain/application/infrastructure.
- Parámetros de Configuración (plazos, meta, umbrales, límites SLA) viven tras `IParametroRepository`; valores por defecto en el simulador y cambios guardados en el navegador — el permiso de edición se valida en el caso de uso según `Rol.editaParametros`.
- Estatus "Vencida" se calcula en dominio (`estaVencida`) con el "ahora" inyectado: autorizada sin conciliar cuyo plazo de presentación expiró.
- Catálogos de administración (layouts, modelo semántico, controles de seguridad) viven tras `IAdministracionRepository` con datos simulados en `infrastructure/mock/data/administracion.ts` — permite conectar el backend real sin tocar pantallas.
- La navegación (menú lateral agrupado y pestañas superiores) se define una sola vez en `NAVEGACION` de `AppShell` y se filtra por `Rol.pantallas` — evita menús desalineados con permisos.
