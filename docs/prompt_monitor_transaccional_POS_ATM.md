# Prompt — Monitor transaccional POS y ATM

Crea una aplicación web de una sola página (un solo archivo HTML autocontenido, con CSS y JavaScript en el mismo archivo, sin librerías externas; las gráficas se dibujan en SVG propio) llamada **"Monitor transaccional POS y ATM"**, con el lema **"Cada transacción, del cobro a la liquidación."**

Es un módulo interno de monitoreo para una institución financiera en México que sigue cada transacción POS (terminales punto de venta) y ATM (cajeros) a lo largo de todo su ciclo: **Autorización → Compensación → Liquidación → Intercambio → Envío de archivo**. Todo el texto en español; montos y números con formato es-MX (ej. $1,234.56, "$2.35 M", "$850.2 mil"); fechas como "25 sep 2026 09:40".

---

## 1. Datos de ejemplo (simulados)

Genera los datos con un generador pseudoaleatorio con **semilla fija** (20260925) para que siempre salgan igual. Fecha y hora "actual": **25 sep 2026, 09:40**. Periodo generado: **últimos 60 días**.

**Catálogos**

- 6 adquirentes (Banco Altavista, Grupo Financiero Meridiano, Banco Trébol, Financiera Rumbo, Banco del Istmo, Banco Ventura) con ID numérico de 11 dígitos.
- 7 emisores (Banco Noreste, Grupo Financiero Cumbre, Banco Capital Azul, Financiera Horizonte, Banco Sureste, Caja Popular Unión, Banco Puente) con ID numérico de 11 dígitos.
- 7 números de afiliación de 7 dígitos por adquirente.
- BINs: 557910, 415231, 491566, 520488, 455512, 537830, 406004; ~420 PANs de 16 dígitos. Mostrar PAN enmascarado: `5579 10•• •••• 1234`.

**Volumen diario**

- POS: 33–43 transacciones por día; ATM: 19–25 por día.
- Factor de fin de semana: domingo ×0.72, sábado ×0.86.
- Día actual: solo 30% del volumen (día parcial, horas 0–9).
- Hace 4 días: volumen POS al 62% (para disparar la alerta de volumen anómalo).
- Distribución por hora con curva realista (baja de madrugada, pico entre 12 y 17 h).
- En ~55% de los días, agregar una transacción POS "compensada sin autorización previa".

**Campos de cada transacción**
ID (`TX-AAAAMMDD-00000001`), canal (POS/ATM), fecha y hora, adquirente, emisor, afiliación, PAN, referencia de 23 dígitos (empieza con 7), número de autorización alfanumérico de 6 caracteres (vacío si rechazada), tipo Débito (64%) / Crédito (36%), monto.

**POS**

- Monto: entre $35 y ~$6,535, sesgado a montos bajos.
- Circuito: Local 49%, Saliente 20%, Entrante 17%, Interredes 9%, Internacional 5%.
- Origen: Online 80%, Archivo (TEF) 15%, Papel 5%.
- Aprobación: 93.5%.

**ATM**

- Operaciones (peso / tasa de aprobación): Retiros 45 / 96.1%, Consultas 20 / 97.8%, Surcharge 25 / 100%, TAE 6 / 88.4%, Donativos 4 / 99.2%.
- Montos: Retiros $200–$5,000 en billetes redondos; Consultas $0; Surcharge $25–$37; TAE $100–$1,500; Donativos $10–$100.

**Motivos de rechazo** (código, descripción, peso): 51 Fondos insuficientes 37, 05 No aprobar 20, 55 NIP incorrecto 15, 61 Excede límite de monto 11, 54 Tarjeta vencida 8, 91 Emisor no disponible 5, 14 Tarjeta inválida 4.

**Semáforo por etapa**
Cada transacción tiene un estado por etapa: verde = completado, gris = pendiente en plazo, rojo = inconsistencia o rechazo, "No aplica".

Reglas:

- Rechazada → autorización en rojo, el resto no aplica.
- POS: compensación pendiente el primer día; ~1.2% "Autorizada sin compensar" (rojo si ya venció el plazo); ~2.1% "Discrepancia de importe" (importe compensado entre 88% y 98% del autorizado).
- ATM: ~1.2% "Sin match TLF vs. STATS".
- Liquidación pendiente antes de 2 días, ~0.4% "Inconsistencia en liquidación". Los ATM del 24 sep 2026 quedan pendientes en liquidación porque falta el archivo SETL de ese día.
- Intercambio y envío pendientes antes de 3 días; ~0.4% "Rechazo en intercambio"; ~0.3% "Fallo en envío de archivo".
- POS también tiene posteo y depósito (pendientes o completados) y ~0.4% con aclaración (Abierta o Resuelta).
- Plazo de presentación: **débito 30 días, crédito 120 días**; calcular días restantes o "Vencido".

**Archivos fuente por etapa**

- ATM: autorización `TLF_AAAAMMDD.dat`, compensación `STATS_AAAAMMDD.dat`, liquidación `SETL_AAAAMMDD.txt`, intercambio `INTX_AAAAMMDD_A.dat` (+2 días), envío `ENV_AAAAMMDD.out`.
- POS: autorización "Online (switch)", "Archivo TEF" (`TEF_AAAAMMDD_01.dat`) o "Fuente papel" (`PAP_AAAAMMDD_01.csv`); compensación `COMP_AAAAMMDD_01.dat` (+1 día); liquidación `LIQ_AAAAMMDD.txt`; intercambio y envío igual que ATM.

**Duplicados TEF**
Crear 8 duplicados de transacciones POS de origen Archivo: el duplicado viene en `TEF_AAAAMMDD_02.dat`, se retiene en compensación para evitar un cargo doble, y original y duplicado comparten una **Llave de correlación PET** (`PET-XXXX-AAAAMMDD-0000`). Guardar número de línea en el archivo y hora de recepción de cada uno (el duplicado llega 2–3 horas después).

**Estatus derivados**

- Estatus: Match, No match, En proceso, Rechazada.
- Clase para trazabilidad: Ciclo completo, Pendiente, Con inconsistencia, Rechazada, Duplicada.

---

## 2. Alertas

Generar una alerta por cada transacción con inconsistencia (categoría **Negocio**) más estas alertas **técnicas** fijas:

| Grupo                           | Tipo                                     | Etapa         | Fuente                            | Fecha        | Severidad | Estado      |
| ------------------------------- | ---------------------------------------- | ------------- | --------------------------------- | ------------ | --------- | ----------- |
| Archivos esperados no recibidos | Archivo SETL no recibido                 | Liquidación   | SETL_20260924.txt                 | 25 sep 07:00 | Alta      | Abierta     |
| Retrasos de pipelines           | ETL de compensación cerca del límite SLA | Compensación  | Cloud Composer · dag_compensacion | 25 sep 08:15 | Media     | Abierta     |
| Umbrales de rechazo             | Rechazo TAE por encima del 8%            | Autorización  | Online ATM                        | 25 sep 06:15 | Media     | En atención |
| Rendimiento                     | Latencia p95 de búsqueda mayor a 3 s     | Plataforma    | Cloud Monitoring                  | 25 sep 09:12 | Media     | Abierta     |
| Volúmenes anómalos              | Volumen POS 38% debajo del esperado      | Autorización  | Online POS                        | 21 sep 23:50 | Media     | Cerrada     |
| Fallos de pipelines             | Job de ingesta TEF falló y se reintentó  | Recepción TEF | Dataflow · ingest_tef             | 23 sep 08:02 | Alta      | Cerrada     |
| Procesos ETL                    | Registros rechazados por formato         | Compensación  | COMP_20260922_01.dat              | 22 sep 04:31 | Baja      | Cerrada     |
| Eventos técnicos                | Reinicio de instancia de la API          | Plataforma    | Cloud Run · api-monitor           | 24 sep 22:10 | Baja      | Cerrada     |
| Fallos de ejecución             | Motor de match terminó con error         | Match         | Cloud Composer · dag_match        | 19 sep 08:40 | Alta      | Cerrada     |

Reglas para alertas de negocio:

- Grupo por defecto "Transacciones sin match", severidad Media.
- Duplicados → grupo "Duplicados", severidad Alta, etapa "Recepción TEF".
- Discrepancia de importe → grupo "Discrepancias de importes", Alta.
- Compensada sin autorización previa o plazo vencido → Alta.
- Fallo en envío de archivo → grupo "Fallos de ejecución", Alta.
- Estado según antigüedad: más de 7 días casi todas Cerradas; de 2 a 7 días mitad En atención y mitad Abiertas; recientes Abiertas.

Grupos disponibles: Transacciones sin match, Duplicados, Discrepancias de importes, Archivos esperados no recibidos, Volúmenes anómalos, Umbrales de rechazo, Fallos de pipelines, Retrasos de pipelines, Procesos ETL, Eventos técnicos, Rendimiento, Fallos de ejecución.

ID de alerta: `AL-00001`. Guardar en el navegador los cambios de estado de las alertas para que persistan al recargar.

---

## 3. SLA

Procesos (tipo y límite):

1. Carga de autorizaciones online — duración, 5 min.
2. Recepción archivo TLF — hora límite 06:00.
3. Recepción archivo STATS — hora límite 06:30.
4. Recepción archivo SETL — hora límite 07:00.
5. ETL de compensación — duración, 45 min (inicia ~07:30).
6. Motor de match — duración, 30 min (inicia al terminar el ETL + 3 min).
7. Detección de duplicados TEF — duración, 10 min (inicia 08:05).
8. Envío de archivo de intercambio — hora límite 10:00.

Generar los últimos 14 días:

- Procesos con hora límite: llegada normalmente antes del límite, ~6% tarde. Hoy, el SETL no ha llegado (Incumplido) y el envío de intercambio sigue Programado.
- Procesos de duración: p50 y p95. Hoy el ETL de compensación tiene p50 38 y p95 44 min (En riesgo).
- Estados: hora límite → En tiempo / Incumplido / Programado / Sin recibir. Duración → En tiempo si p95 ≤ 85% del SLA, En riesgo si p95 ≤ SLA, Incumplido si lo supera.

---

## 4. Login y roles

Pantalla de inicio de sesión de demostración con dos columnas: a la izquierda la marca, el lema "Cada transacción, del cobro a la liquidación." y la descripción del ciclo; a la derecha "Iniciar sesión" con un selector de rol (mostrar la descripción de cada rol), botón "Ingresar con cuenta corporativa" y las notas "En producción el acceso es con tu cuenta corporativa", "Para esta demostración elige un rol y verás solo las funciones que ese rol tiene permitidas", "Los accesos, consultas y descargas quedan registrados en la bitácora" y "Uso interno. Información confidencial."

| Rol                          | Descripción                                          | Pantallas                                       | Descargas | Atiende alertas |
| ---------------------------- | ---------------------------------------------------- | ----------------------------------------------- | --------- | --------------- |
| Administrador                | Acceso total, bitácora y atención de alertas         | Todas                                           | Sí        | Sí              |
| Operaciones (predeterminado) | Dashboards, SLA, trazabilidad y atención de alertas  | Ejecutivo, POS, ATM, SLA, Trazabilidad, Alertas | Sí        | Sí              |
| Conciliación                 | Dashboards, trazabilidad, fichas y reporte No Match  | Ejecutivo, POS, ATM, Trazabilidad, No Match     | Sí        | No              |
| Ejecutivo                    | Dashboard ejecutivo y SLA, solo consulta             | Ejecutivo, SLA                                  | No        | No              |
| Auditoría                    | Consulta de todo el módulo y bitácora, sin descargas | Todas                                           | No        | No              |

Recordar el último rol elegido. En la parte inferior de la barra lateral mostrar avatar, rol y botón para cambiar de rol o cerrar sesión.

---

## 5. Estructura general

- **Barra lateral oscura fija** (236 px): logo cuadrado azul, nombre del módulo y subtítulo; menú con íconos: Ejecutivo, Dashboard POS, Dashboard ATM, SLA, Trazabilidad, Alertas (con badge rojo del número de alertas abiertas), Reporte No Match, Bitácora. Solo se muestran las pantallas permitidas por el rol.
- **Encabezado de página**: título grande, subtítulo gris y botones de acción a la derecha.
- **Barra de filtros global** (Ejecutivo, POS, ATM): Periodo (Últimos 7, 30 o 60 días, Personalizado con fechas desde/hasta), Adquirente, Emisor y, en POS, Origen y Circuito. Los filtros activos se resaltan con borde azul. A la derecha, indicador de frescura con punto verde ("Actualizado 25 sep 2026 09:40").
- **KPIs** en tarjetas con valor grande, nota y flecha de tendencia verde o roja.
- Tabla de datos paginada con botones Anterior / Siguiente.
- Notificaciones tipo _toast_ abajo ("Descarga lista: archivo.xlsx", "Descarga cancelada", etc.).

---

## 6. Pantallas

### 6.1 Dashboard ejecutivo

Subtítulo: "Salud de la operación: volumen, integridad y continuidad del flujo transaccional".

- KPIs: **Transacciones autorizadas** (POS y ATM), **Importe procesado**, **Match online vs. compensación** (meta 98.0%, verde si la cumple), **Pendientes en plazo** (Débito 30 d · crédito 120 d), **Con inconsistencia** (% del total), **Duplicados detectados** (Con Llave PET asignada).
- **Avance del ciclo transaccional**: embudo de barras verticales con las 5 etapas, cantidad y "% de lo autorizado", con opacidad decreciente.
- **Continuidad del flujo**: gráfica de línea del volumen diario contra el promedio del periodo.
- **Integridad por fuente**: tabla "Archivos recibidos contra esperados" con Fuente, Archivos (recibidos / esperados), Registros, Match y Estado para Autorizaciones online (Continuo), TLF, STATS, SETL (Incumplido por el archivo faltante), Compensación POS y Archivos TEF (En riesgo si hay duplicados).
- **Alertas abiertas** agrupadas por tipo, con chip de severidad máxima y conteo; al tocar una, abre la bandeja de alertas filtrada.

### 6.2 Dashboard POS

Subtítulo: "Monitoreo del circuito POS".

- KPIs: Autorizadas, Rechazadas, Ticket promedio, Completadas, Pendientes, Con incidencia, Importe pendiente.
- Autorizadas vs. rechazadas por día (barras apiladas).
- Motivos de rechazo (barras horizontales con código y descripción; "Sin rechazos en el periodo" si no hay).
- Distribución por circuito (tocar para filtrar).
- **Etapas del circuito**: Compensación, Posteo, Depósito y Aclaración, con completadas, "Posteo pendiente", "Depósito pendiente" y aclaraciones Abiertas o Resueltas.
- **Valores no compensados** e importe pendiente.

### 6.3 Dashboard ATM

Subtítulo: "Operaciones de cajeros: TLF, SETL y conciliación contra STATS".

- Aviso destacado: "El archivo SETL con datos del 24 sep 2026 no se ha recibido".
- **Resumen TLF**: Total de transacciones, Operaciones aprobadas, Operaciones rechazadas, Importe aprobado, Retiros aprobados, Importe dispensado.
- **Resumen SETL**: últimos días con información, conteo e importe acumulado.
- **Tipos de operación ATM** (Retiros, Consultas, Surcharge, TAE, Donativos) con aprobadas / rechazadas.
- Aprobadas vs. rechazadas por día.
- **Comparación TLF vs. STATS**: Match, Sin match y Tasa de match.

### 6.4 Dashboard de SLA

Subtítulo: "Tiempos de procesamiento y entrega, desviaciones e incumplimientos".

- KPIs: Procesos en tiempo, En riesgo, Incumplidos, Retraso acumulado.
- **Cumplimiento diario** de los últimos 14 días: barras con % de procesos en tiempo, meta 98%, eje desde 50%; tocar un día para ver su detalle.
- **Ejecución del día contra SLA**: línea de tiempo tipo Gantt con leyenda En tiempo / En riesgo / Incumplido / Límite SLA; línea punteada roja para el tiempo de espera fuera de SLA.
- **Procesos y niveles de servicio**: tabla con Proceso, Límite SLA, Programado, Real / p50, Desvío / p95 y Estado.
- Nota: "Valores SLA de ejemplo, parametrizables".

### 6.5 Trazabilidad de transacciones

Subtítulo: "Busca por uno o varios filtros y sigue cada transacción a lo largo del ciclo".

- Filtros de búsqueda: ID único, Adquirente, Emisor, PAN, Referencia, Fecha, Monto, Número de Afiliación, Número de Autorización. Botones Buscar y Limpiar. Nota: "Puedes combinar varios filtros. Se devuelven los registros que coinciden con todos."
- Botones de ejemplo que llenan los filtros, p. ej. "Autorización ATM con ciclo completo", "Duplicada", "Afiliación + fecha".
- Resultados paginados con semáforo por etapa (Aut, Comp, Liq, Int, Envío), estatus, plazo ("Quedan N días" o "Vencido") y botón "Ver ficha".
- Leyenda: Completado, Pendiente en plazo, Inconsistencia o rechazo, No aplica. Nota: "Plazos de presentación: débito 30 días, crédito 120 días."
- Mensaje vacío: "Ningún registro coincide exactamente con los filtros capturados. Revisa…"
- Botón **Exportar resultados** (CSV).

### 6.6 Ficha de la transacción

- Botón "Volver a resultados".
- **Datos de la transacción**: ID, canal, fecha, adquirente, emisor, afiliación, PAN enmascarado, referencia, autorización, tipo, monto, estatus, Llave PET si aplica.
- **Semáforo de trazabilidad** con las etapas.
- **Cruce de trazabilidad por proceso**: tabla Proceso, Fuente, Nombre de archivo y Estatus para autorización, compensación, liquidación e intercambio.
- Mensajes explicativos según el caso: "Autorizada y aún sin compensar. Quedan N días", "El importe de compensación ($X) no coincide con el autorizado", "La transacción llegó a compensación sin una autorización online previa", "Transacción rechazada en autorización" (con motivo), "Registro duplicado de TX-…, se retuvo en compensación para evitar un cargo doble", "Este registro original tiene un duplicado: TX-…", "Ciclo conciliado".
- Botones **Descargar Excel** y **Descargar PDF**.

### 6.7 Alertas

Subtítulo: "Inconsistencias de negocio y eventos técnicos, con seguimiento de atención". Nota: "Integrado con Cloud Monitoring".

- KPIs: Abiertas, En atención, Cerradas y conteo por grupo.
- Filtros: Grupo, Etapa, Severidad y Estado (Abiertas y en atención, Abiertas, En atención, Cerradas, Todas).
- **Bandeja de alertas** paginada: Fecha / hora, Tipo de inconsistencia, Grupo, Etapa, Severidad (chip Alta rojo, Media ámbar, Baja gris), Estado, botón "Ver detalle".
- **Detalle de la alerta**: tipo, etapa donde se detectó, fuente involucrada, fecha, severidad, estado, "Abrir ficha de la transacción". Para duplicados: registro original y registro duplicado lado a lado con archivo, línea, hora de recepción y Llave de correlación PET.
- Acciones según estado: "Tomar en seguimiento", "Cerrar alerta", "Regresar a abierta", "Reabrir alerta". Si el rol no puede actuar: "Tu rol puede consultar esta alerta, pero no cambiar su estado."
- Botón **Exportar alertas** (Excel). Mensaje vacío: "No hay alertas con estos filtros."

### 6.8 Reporte de No Match

Subtítulo: "Solo transacciones sin match entre el proceso online y el proceso de compensación".

- Dos pestañas con conteo: **Autorizadas no compensadas** y **Compensadas sin autorización previa**.
- Resumen: transacciones, importe, más antigua, plazo vencido.
- Tabla paginada: ID, fecha, adquirente, afiliación, autorización, importe, estatus (En proceso / Vencido) y "Quedan N días". Exportar a Excel.
- Mensaje vacío: "No hay transacciones en esta categoría para los filtros seleccionados."

### 6.9 Bitácora

Subtítulo: "Accesos, búsquedas, descargas y cambios de estado registrados en esta sesión". Nota: "En producción se almacena en Cloud Logging".

- Tabla: Fecha / hora (con segundos), Rol, Evento y Detalle. Registrar inicio de sesión, cambio de rol, navegación, búsquedas, apertura de fichas, descargas y cambios de estado de alertas. Mensaje vacío: "Aún no hay eventos."

---

## 7. Diseño visual

- Estilo corporativo sobrio y limpio.
- Tipografía **IBM Plex Sans** (texto) e **IBM Plex Mono** (IDs, referencias, archivos, PAN), con cifras tabulares.
- Paleta clara: fondo #F4F3EF, tarjetas #FFFFFF con borde #E2E0DA y radio de 10 px, texto #16181D, gris #5B606B, acento azul #1F4FD1 (suave #E3EAFB), naranja #C4620F para la segunda serie.
- Estados: verde #2E7D4F (fondo #DCEFE2), rojo #B3261E (fondo #F8DDD9), gris pendiente (fondo #E9EAEC), ámbar (texto #7A3D06, fondo #FBE9D6).
- Barra lateral #16181D con opción activa #2B303B.
- **Modo oscuro** automático según el sistema (fondo #121418, tarjetas #1B1E24, acento #7B98F2).
- Botones de 38 px: primario azul relleno, secundarios con borde; controles segmentados con estado presionado en azul suave.
- Responsivo: en pantallas chicas la barra lateral se compacta, las rejillas pasan a una columna y las tablas anchas se desplazan horizontalmente.
- Accesible: foco visible, etiquetas aria en navegación y gráficas, texto oculto para lectores de pantalla.
