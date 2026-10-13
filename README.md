# Sistema de Gestion para Salon de Eventos

Web app para administrar un salon de eventos: calendario por turnos, cotizaciones por link, reservas con sena, pagos, servicios adicionales, recordatorios y reportes.

## Objetivo

Construir un software de gestion simple y confiable para un unico salon de eventos. La prioridad es que el equipo pueda organizar consultas, cotizaciones y reservas sin perder fechas, pagos ni seguimientos.

## Stack Sugerido

- Next.js para frontend y backend.
- PostgreSQL como base de datos.
- Prisma como ORM.
- Autenticacion con NextAuth/Auth.js o equivalente.
- Almacenamiento de archivos futuro con Cloudflare R2.

## Desarrollo Local

1. Instalar dependencias:

```bash
npm install
```

2. Copiar variables de entorno:

```bash
cp .env.example .env
```

3. Levantar PostgreSQL:

```bash
docker compose up -d
```

4. Crear tablas y cargar datos iniciales:

```bash
npm run db:push
npm run db:seed
```

5. Iniciar la app:

```bash
npm run dev
```

## Despliegue en VPS con Docker

1. Crear `.env` desde `.env.example` y cambiar `POSTGRES_PASSWORD`.

2. Construir y levantar app + base:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

3. El servicio `migrate` espera a PostgreSQL, crea/actualiza tablas con Prisma y carga datos iniciales antes de iniciar la app.

4. La app queda expuesta en `APP_PORT`.

## Alcance MVP

El MVP debe incluir:

1. Login para usuarios internos.
2. Calendario con vista mensual, semanal y diaria.
3. Eventos por fecha y turno.
4. Clientes simples con nombre y telefono.
5. Cotizaciones con link publico sin login.
6. Servicios configurables con precios editables por cotizacion.
7. Alquiler del salon como item fijo obligatorio.
8. Registro de pagos en efectivo o transferencia.
9. Cambio de estado segun cotizacion, aceptacion y sena.
10. Boton para enviar cotizacion por WhatsApp.
11. Recordatorios internos y mensajes sugeridos para cliente.
12. Reportes basicos de eventos, cotizaciones, ingresos y saldos pendientes.

## Reglas del Salon

- Hay un solo salon.
- Los turnos iniciales son `Manana`, `Tarde` y `Noche`.
- Puede haber varios eventos el mismo dia si usan turnos distintos.
- No puede haber dos eventos reservados o confirmados para la misma fecha y el mismo turno.
- Las consultas y cotizaciones pueden repetirse en una misma fecha y turno, pero el sistema debe advertir que ya hay interesados.
- La reserva real ocurre solo cuando se registra la sena.
- La aceptacion del cliente no bloquea definitivamente la fecha.

## Estados del Evento

- `Consulta`: primer contacto o evento cargado sin cotizacion enviada.
- `Cotizado`: cotizacion armada/enviada, pendiente de respuesta.
- `Aceptado`: el cliente o el equipo acepto la cotizacion, pero aun no se registro sena.
- `Reservado`: se registro la sena y el turno queda bloqueado.
- `Confirmado`: el evento esta totalmente confirmado, idealmente con pago completo o aprobacion final del equipo.
- `Cancelado`: evento dado de baja.
- `Finalizado`: evento ya realizado.

## Colores Sugeridos del Calendario

- `Consulta`: gris.
- `Cotizado`: amarillo.
- `Aceptado`: naranja.
- `Reservado`: verde.
- `Confirmado`: azul.
- `Cancelado`: rojo.
- `Finalizado`: gris oscuro.

## Cotizaciones

Una cotizacion debe contener:

- Cliente.
- Telefono.
- Fecha del evento.
- Turno.
- Tipo de evento.
- Cantidad aproximada de invitados.
- Alquiler del salon como item obligatorio.
- Servicios adicionales.
- Precio editable por item.
- Total.
- Sena requerida manual.
- Saldo pendiente.
- Condiciones.
- Fecha de vencimiento igual a la fecha del evento.
- Link publico para ver y responder.

## Flujo Principal

1. El equipo crea un evento en estado `Consulta`.
2. Carga cliente, telefono, fecha, turno, tipo de evento y cantidad aproximada de invitados.
3. Arma la cotizacion con alquiler obligatorio y servicios adicionales.
4. Al guardar/enviar la cotizacion, el evento pasa a `Cotizado`.
5. El sistema genera un link publico privado.
6. El equipo envia el link por WhatsApp usando una plantilla.
7. El cliente abre el link sin login.
8. El cliente puede aceptar o rechazar la cotizacion.
9. El duenio o personal tambien puede aceptar la cotizacion manualmente.
10. Si la cotizacion se acepta, el evento pasa a `Aceptado`.
11. Cuando el equipo registra el pago de la sena, el evento pasa a `Reservado`.
12. Si se completa el pago o se aprueba internamente, puede pasar a `Confirmado`.
13. Despues de la fecha del evento, el equipo puede marcarlo como `Finalizado`.

## WhatsApp

El MVP no necesita integracion automatica con WhatsApp Business API. Debe tener un boton que abra WhatsApp con un mensaje prearmado.

Plantilla inicial:

```text
Hola {nombre}, te compartimos la cotizacion para tu evento del dia {fecha} en el turno {turno}.
Podes verla y confirmarla desde este link:
{link}
```

## Pagos

Medios de pago iniciales:

- Efectivo.
- Transferencia.

Cada pago debe guardar:

- Evento/cotizacion asociada.
- Monto.
- Medio de pago.
- Fecha.
- Observacion opcional.

El sistema debe calcular automaticamente:

- Total cotizado.
- Total pagado.
- Saldo pendiente.
- Si la sena requerida ya fue cubierta.

La subida de comprobantes queda fuera del MVP, pero el modelo debe permitir agregar archivos mas adelante.

## Servicios

Servicios iniciales sugeridos:

- Alquiler del salon.
- Catering.
- Luces.
- Sonido.
- DJ.
- Decoracion.
- Mozos.
- Seguridad.
- Limpieza.
- Otro.

Los servicios deben poder crearse, editarse, activarse y desactivarse. El precio base es opcional porque el precio final puede variar en cada cotizacion.

## Usuarios

Roles iniciales:

- Duenio.
- Personal operativo.

En el MVP ambos roles tienen permisos completos. Los permisos finos pueden agregarse despues.

## Recordatorios

Recordatorios internos sugeridos:

- Enviar cotizacion.
- Cobrar sena.
- Confirmar evento.
- Revisar saldo pendiente.
- Contactar cliente antes del evento.
- Tareas internas del evento.

Recordatorios para cliente sugeridos:

- Pago de sena pendiente.
- Saldo pendiente.
- Confirmacion de reserva.
- Mensaje previo al evento.

En el MVP pueden ser recordatorios visibles y mensajes listos para enviar. La automatizacion real puede venir despues.

## Reportes

Reportes iniciales:

- Eventos por mes.
- Eventos por estado.
- Ingresos estimados.
- Pagos recibidos.
- Saldos pendientes.
- Cotizaciones enviadas.
- Cotizaciones aceptadas.
- Cotizaciones rechazadas.
- Fechas libres y ocupadas.

## Modelo de Datos Conceptual

Entidades principales:

- `User`
- `Client`
- `Event`
- `Turn`
- `Service`
- `Quote`
- `QuoteItem`
- `Payment`
- `Reminder`

## Criterio Visual

El frontend debe sentirse como un software de gestion sobrio y cotidiano, no como una landing page moderna ni una app generada por IA.

Principios:

- Priorizar claridad, densidad razonable y lectura rapida.
- Usar colores funcionales, especialmente para estados.
- Evitar gradientes llamativos, tarjetas excesivamente grandes, sombras dramaticas y animaciones innecesarias.
- Preferir tablas, formularios claros, paneles simples y calendario legible.
- Mantener una estetica limpia, profesional y tranquila.
- Cuidar espaciado, jerarquia tipografica y consistencia para que no se vea improvisado.

## Fuera del MVP

- PDF de cotizaciones.
- Contratos digitales.
- Comprobantes de pago subidos por el cliente.
- WhatsApp Business API.
- Mercado Pago.
- Permisos granulares.
- Multiples salones.
- Portal de cliente con login.
