# Plan de Implementacion y Continuidad

Este documento registra decisiones funcionales, prioridades tecnicas y el estado de implementacion. Debe leerse junto con `README.md` y `AGENTS.md` antes de continuar cambios.

## Decisiones Funcionales Confirmadas

- El sistema se organiza alrededor del evento. Primero se busca o selecciona un evento y luego se gestionan sus secciones.
- En el MVP existe una sola cotizacion activa por evento.
- El flujo esperado es: evento en consulta, cotizacion, aceptacion, pagos/sena y reserva.
- Los pagos se registran despues de crear la cotizacion. Para convertir el evento en reserva, la cotizacion debe estar aceptada y la sena cubierta.
- Los pagos de cotizacion son ingresos generales del evento.
- Los pagos individuales de egresados y familiares tambien son ingresos del evento, pero deben conservar su origen para poder informar quien pago y por que concepto.
- Los eventos de egresados tienen colegios, egresados, familiares, tarifas individuales y pagos parciales o totales.
- El cupo gratuito por discapacidad sigue pendiente de definicion. No automatizar un limite hasta confirmar si aplica por evento, colegio o egresado.
- Las interfaces deben funcionar en desktop, tablet y mobile.
- La autenticacion interna usa Better Auth con correo y contrasena, sesiones persistidas y registro cerrado por invitacion.
- Existe un superadmin global con un panel para crear salones e invitar duenios, administradores y personal operativo.
- Cada salon se representa como una organizacion. Los datos operativos siempre quedan asociados al salon activo.

## Direccion de Producto

### Navegacion

- `Eventos` es el punto de entrada operativo.
- Eventos debe ofrecer dos vistas: calendario y listado buscable/paginado.
- No usar un select con todos los eventos porque no escala.
- El expediente de un evento contiene: Resumen, Cotizacion, Pagos y Egresados cuando corresponda.
- Dentro de Egresados existen dos subsolapas: Carga y configuracion; Padron y pagos.

### Listas

- Paginar listas que puedan crecer: eventos, pagos, padron, servicios, tipos de evento y listados operativos del dashboard.
- No paginar selects ni items de una cotizacion publica.
- La paginacion debe realizarse en PostgreSQL/Prisma cuando el volumen lo justifique, no solamente con `slice` despues de cargar toda la tabla.
- Los filtros deben conservarse al cambiar de pagina y volver a pagina 1 cuando cambian.

## Prioridades Tecnicas

1. Mantener el proyecto compilable.
2. Proteger la aplicacion interna con Better Auth y autorizacion en paginas y Server Actions cuando se implemente el modelo de superadmin, invitaciones y pertenencia al salon.
3. Garantizar en base de datos que no existan dos eventos reservados/confirmados en la misma fecha y turno.
4. Ejecutar cotizacion, pago y cambios de estado mediante transacciones.
5. Versionar cambios de base con migraciones y usar `prisma migrate deploy` en produccion.
6. Centralizar y validar transiciones de estados.
7. Mostrar errores funcionales en los formularios en lugar de retornar silenciosamente.
8. Agregar tests de integracion para reservas, pagos, vencimientos y concurrencia.

## Estado Actual

### Implementado

- Calendario de eventos con vistas mes, semana y tres dias.
- Expediente basico por evento.
- Cotizacion y pagos contextualizados por evento.
- Link publico de cotizacion.
- Modulo inicial de egresados con colegios, familiares, tarifas y pagos individuales.
- Busqueda del padron por persona o colegio.
- Subsolapas de carga/configuracion y padron/pagos.
- Base inicial para paginacion en `lib/pagination.ts` y `app/(interno)/pagination.tsx`.
- Solapas Calendario/Listado en Eventos con busqueda y filtros por estado, turno y rango de fechas.
- Listado de eventos paginado en PostgreSQL mediante `count`, `skip` y `take`.
- Navegacion del expediente adaptada para recibir solamente el evento abierto.
- Paginacion PostgreSQL en historial de pagos, servicios, tipos de evento, padron por grupo familiar y listados del dashboard.
- Metricas y listados del dashboard calculados con consultas y agregaciones acotadas.
- Una cotizacion por evento garantizada por unicidad en base de datos.
- Tokens publicos nuevos generados con 256 bits aleatorios.
- Creacion y aceptacion de cotizaciones ejecutadas junto con el cambio de estado del evento dentro de una transaccion.
- Pagos generales validados contra el saldo y serializados por cotizacion.
- La reserva exige cotizacion aceptada y sena cubierta; pago y reserva se confirman o revierten juntos.
- Indice unico parcial PostgreSQL que impide dos reservas/confirmaciones para la misma fecha y turno.
- Consistencia entre pago, cotizacion y evento garantizada con clave foranea compuesta.
- Pagos individuales de egresados serializados para impedir sobrepagos concurrentes.
- Pertenencia de colegio, egresado, familiar y evento garantizada con claves compuestas.
- Tipos de evento con propiedad estructural `supportsGraduationRoster`.
- Migracion inicial versionada, `prisma migrate deploy` en produccion y seed demostrativo retirado del despliegue.
- Healthcheck de aplicacion y base, contenedor sin usuario root y puerto de produccion limitado a localhost.
- CI con PostgreSQL, migraciones, typecheck, pruebas y build.
- Better Auth integrado con sesiones, plugin de administracion y organizaciones.
- Registro de cuentas cerrado: solo se permite mediante invitacion vigente o por el bootstrap explicito del superadmin.
- Modelo multi-salon con membresias `owner`, `admin` y `member`; el superadmin usa un rol global separado.
- Login, cierre de sesion, aceptacion de invitaciones, estado sin salon y panel de superadmin.
- Creacion de salones con catalogo operativo inicial y enlaces privados de invitacion para compartir manualmente.
- Paginas internas protegidas desde el layout y Server Actions protegidas de forma independiente.
- Datos de clientes, tipos, eventos y servicios aislados por organizacion.
- Migracion inicial regenerada desde cero con tablas Better Auth y restricciones de reserva por salon.
- Comando `db:bootstrap-admin` para preparar el primer superadmin sin cargar datos demostrativos.

### Ultimo bloque verificado

- La migracion inicial se aplico correctamente en una base PostgreSQL aislada.
- Las pruebas de restricciones de reserva, unicidad de cotizacion y consistencia pago/evento finalizaron correctamente.
- `prisma validate`, `npm run typecheck`, las 4 pruebas de integridad y `npm run build` finalizaron correctamente el 16 de octubre de 2026.
- La base local se reconstruyo desde la migracion `20261016000923_initial` y el seed finalizo correctamente.

### Siguiente secuencia recomendada

1. Agregar auditoria de usuario a pagos y cambios de estado usando la sesion disponible.
2. Ampliar pruebas de integracion a autorizacion entre salones, concurrencia de pagos, aceptacion y reserva mediante las Server Actions.
3. Integrar correo transaccional para reemplazar el copiado manual de enlaces de invitacion.
4. Acotar la carga del calendario al periodo visible.
5. Completar la maquina de estados para confirmacion, cancelacion y finalizacion.

## Reglas de Integridad Implementadas

- Una cotizacion por evento queda garantizada con unicidad en base de datos.
- Un pago solo puede referenciar una cotizacion del mismo evento.
- Si una sena intenta reservar un turno ocupado, no se registra ni el pago ni la reserva.
- La reserva requiere cotizacion aceptada y sena cubierta. Se permiten pagos previos a la aceptacion.
- Los pagos generales e individuales no pueden superar su saldo.
- Los pagos impiden borrar fisicamente su cotizacion o evento.
- Colegio, egresado y familiar deben pertenecer al mismo evento.
- El padrón de egresados se habilita mediante una propiedad estructural del tipo de evento.
- El vencimiento se valida al mostrar y responder una cotizacion publica.

## Verificacion Obligatoria

Antes de cerrar cada bloque de trabajo ejecutar:

```bash
npm run typecheck
npm run build
```

Para cambios de Prisma ejecutar tambien:

```bash
npx prisma validate
npx prisma generate
```

No considerar terminado un bloque si alguno de esos comandos falla.

## Decisiones Aun Pendientes

- Alcance exacto de los cupos gratuitos por discapacidad.
- Politica de anulacion, devolucion o correccion de pagos.
- Si un cambio de precio de tarjeta recalcula personas ya cargadas.
- Forma final de reportar juntos los pagos generales y los pagos individuales de egresados.
- Permisos finos que diferenciaran a duenios, administradores y personal operativo despues del MVP.
