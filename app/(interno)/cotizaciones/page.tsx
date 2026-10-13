import { formatDate } from "@/lib/domain";
import { getClients, getEvents, getPayments, getQuotes, getServices } from "@/lib/data";
import { QuotesTable } from "./quotes-table";
import { createQuote } from "./actions";
import { MoneyInput } from "./money-input";
import { QuoteItemsEditor } from "./quote-items-editor";

export const dynamic = "force-dynamic";

type QuotesPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function QuotesPage({ searchParams }: QuotesPageProps) {
  const { error } = await searchParams;
  const [clients, events, payments, quotes, services] = await Promise.all([
    getClients(),
    getEvents(),
    getPayments(),
    getQuotes(),
    getServices(),
  ]);
  const eventsWithoutQuote = events.filter(
    (event) =>
      event.status !== "CANCELADO" && event.status !== "FINALIZADO" && !quotes.some((quote) => quote.eventId === event.id),
  );
  const requiredService = services.find((service) => service.required && service.active);
  const optionalServices = services.filter((service) => !service.required && service.active);

  return (
    <>
      <header className="pageHeader">
        <div>
          <h1>Cotizaciones</h1>
          <p>Listado de cotizaciones con link público y control de saldo.</p>
        </div>
        <a className="button primary" href="#nueva-cotizacion">
          Crear cotización
        </a>
      </header>

      <section className="panel" id="nueva-cotizacion" style={{ marginBottom: 16 }}>
        <div className="panelHeader">
          <h2>Nueva cotización</h2>
        </div>
        {error === "deposit-over-total" ? (
          <div className="warningBox" style={{ margin: 14, marginBottom: 0 }}>
            La seña requerida no puede ser mayor al total de la cotización.
          </div>
        ) : null}
        <form action={createQuote} className="panelBody formGrid">
          <div className="field">
            <label htmlFor="eventId">Evento sin cotización</label>
            <select id="eventId" name="eventId" disabled={eventsWithoutQuote.length === 0}>
              {eventsWithoutQuote.length === 0 ? <option>No hay eventos disponibles</option> : null}
              {eventsWithoutQuote.map((event) => {
                const client = clients.find((item) => item.id === event.clientId);
                return (
                  <option key={event.id} value={event.id}>
                    {formatDate(event.date)} - {event.turn} - {client?.name} - {event.status}
                  </option>
                );
              })}
            </select>
          </div>
          <div className="field">
            <label htmlFor="requiredDeposit">Seña requerida</label>
            <MoneyInput id="requiredDeposit" name="requiredDeposit" placeholder="Ej: 100.000" />
          </div>
          <div className="field fullWidth">
            {eventsWithoutQuote.length === 0 ? (
              <p className="fieldHelp warningInline">No hay eventos pendientes de cotizar. Los eventos que ya tienen cotización no aparecen en esta lista.</p>
            ) : null}
            <label htmlFor="conditions">Condiciones</label>
            <textarea id="conditions" name="conditions" placeholder="La fecha se reserva solo al registrar la seña." />
          </div>
          <div className="field fullWidth">
            <label>Items de la cotización</label>
            <QuoteItemsEditor optionalServices={optionalServices} requiredService={requiredService} />
          </div>
          <div className="formActions">
            <button className="button primary" disabled={eventsWithoutQuote.length === 0 || !requiredService} type="submit">
              Guardar cotización
            </button>
          </div>
        </form>
      </section>

      <QuotesTable clients={clients} events={events} payments={payments} quotes={quotes} />
    </>
  );
}
