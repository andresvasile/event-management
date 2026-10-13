# Guia para Agentes

Este proyecto es una web app de gestion para un salon de eventos. Antes de implementar, mantener el foco en el MVP definido en `README.md`.

## Prioridades

1. Gestionar calendario, eventos y turnos sin conflictos reales de reserva.
2. Crear cotizaciones claras que se puedan compartir por link.
3. Registrar sena y pagos para convertir una cotizacion aceptada en reserva.
4. Mantener el frontend sobrio, usable y propio de un software de gestion.

## Decisiones Ya Tomadas

- Unico salon.
- Turnos iniciales: `Manana`, `Tarde`, `Noche`.
- Se permiten varias consultas/cotizaciones para la misma fecha y turno.
- Se debe advertir si ya hay interesados en una fecha y turno.
- Se bloquea una fecha/turno solo con evento `Reservado` o `Confirmado`.
- La sena es manual por cotizacion.
- La cotizacion vence en la fecha del evento.
- El cliente no tiene login.
- El cliente ve la cotizacion desde un link publico privado.
- El cliente puede aceptar o rechazar desde el link.
- El equipo tambien puede aceptar manualmente.
- El alquiler del salon es un item fijo obligatorio.
- El PDF queda fuera del MVP.

## Reglas de Implementacion

- Hacer cambios pequenos y verificables.
- No agregar abstracciones antes de necesitarlas.
- No implementar compatibilidad hacia atras si no hay datos existentes.
- Evitar features fuera del MVP salvo que el usuario las pida.
- Si hay una duda funcional importante, hacer una pregunta corta antes de avanzar.
- Si hay cambios existentes en el repo, no revertirlos sin permiso.

## Frontend

Usar la skill local `management-frontend` cuando se trabaje en pantallas, estilos o componentes visuales.

Direccion visual:

- Software de gestion sobrio.
- Interfaz basica, clara y confiable.
- No parecer landing page.
- No usar estetica generica de apps modernas con gradientes, glassmorphism, brillos o tarjetas gigantes.
- Los colores deben tener funcion: estados, alertas, acciones y jerarquia.
- Priorizar tablas, listas, formularios, filtros y calendarios legibles.
- Responsive para PC y celular.

## Flujo Funcional Central

1. Crear evento como `Consulta`.
2. Crear cotizacion con alquiler obligatorio y servicios adicionales.
3. Marcar evento como `Cotizado`.
4. Enviar link por WhatsApp.
5. Cliente o equipo acepta la cotizacion.
6. Evento pasa a `Aceptado`.
7. Equipo registra sena.
8. Evento pasa a `Reservado`.
9. Al completar o validar internamente, puede pasar a `Confirmado`.
10. Luego del evento, marcar como `Finalizado`.

## Validaciones Clave

- No permitir `Reservado` o `Confirmado` si ya existe otro evento reservado/confirmado para la misma fecha y turno.
- Al crear consulta/cotizacion en fecha y turno con interesados, mostrar advertencia pero permitir continuar.
- Calcular saldo pendiente desde cotizacion y pagos registrados.
- No considerar aceptacion del cliente como reserva hasta que haya sena registrada.

## Nombres Recomendados

Estados de evento:

- `CONSULTA`
- `COTIZADO`
- `ACEPTADO`
- `RESERVADO`
- `CONFIRMADO`
- `CANCELADO`
- `FINALIZADO`

Estados de cotizacion:

- `BORRADOR`
- `ENVIADA`
- `ACEPTADA`
- `RECHAZADA`
- `VENCIDA`
- `CANCELADA`

Turnos:

- `MANANA`
- `TARDE`
- `NOCHE`

## Referencia Rapida de Pantallas

- Dashboard.
- Calendario.
- Eventos.
- Detalle de evento.
- Cotizaciones.
- Vista publica de cotizacion.
- Servicios.
- Pagos.
- Recordatorios.
- Reportes.

## Criterio de Calidad

La app debe ser aburrida en el buen sentido: rapida de entender, dificil de romper, sin adornos innecesarios y con flujos claros para el trabajo diario del salon.
