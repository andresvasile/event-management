import { MonthCalendar } from "./month-calendar";
import { getClients, getEvents, getEventTypes, getPayments, getQuotes } from "@/lib/data";
import { createEvent } from "./actions";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const [clients, events, eventTypes, payments, quotes] = await Promise.all([
    getClients(),
    getEvents(),
    getEventTypes(),
    getPayments(),
    getQuotes(),
  ]);

  return (
    <>
      <header className="pageHeader">
        <div>
          <h1>Eventos</h1>
          <p>Agenda por fecha y turno. Solo reservado o confirmado bloquea el turno.</p>
        </div>
        <a className="button primary" href="#alta-consulta">
          Crear consulta
        </a>
      </header>

      <section className="panel" id="alta-consulta" style={{ marginBottom: 16 }}>
        <div className="panelHeader">
          <h2>Alta rápida de consulta</h2>
        </div>
        <form action={createEvent} className="panelBody formGrid">
          <div className="field">
            <label htmlFor="clientName">Cliente</label>
            <input id="clientName" name="clientName" placeholder="Nombre y apellido" />
          </div>
          <div className="field">
            <label htmlFor="phone">Teléfono</label>
            <input id="phone" name="phone" placeholder="549..." />
          </div>
          <div className="field">
            <label htmlFor="date">Fecha</label>
            <input id="date" name="date" type="date" />
          </div>
          <div className="field">
            <label htmlFor="turn">Turno</label>
            <select id="turn" name="turn">
              <option>MANANA</option>
              <option>TARDE</option>
              <option>NOCHE</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="eventType">Tipo de evento</label>
            <select id="eventType" name="eventTypeId">
              {eventTypes
                .filter((eventType) => eventType.active)
                .map((eventType) => (
                  <option key={eventType.id} value={eventType.id}>
                    {eventType.name}
                  </option>
                ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="guests">Invitados aproximados</label>
            <input id="guests" min="1" name="guests" type="number" />
          </div>
          <div className="formActions">
            <button className="button primary" type="submit">
              Guardar consulta
            </button>
          </div>
        </form>
      </section>

      <MonthCalendar clients={clients} events={events} payments={payments} quotes={quotes} />
    </>
  );
}
