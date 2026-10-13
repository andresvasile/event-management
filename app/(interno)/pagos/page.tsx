import { formatCurrency, formatDate, quoteTotal } from "@/lib/domain";
import { getClients, getEvents, getPayments, getQuotes } from "@/lib/data";
import { createPayment } from "./actions";
import { MoneyInput } from "../cotizaciones/money-input";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const [clients, events, payments, quotes] = await Promise.all([getClients(), getEvents(), getPayments(), getQuotes()]);
  const eventsWithQuote = events.filter((event) => quotes.some((quote) => quote.eventId === event.id));
  const depositRows = quotes
    .map((quote) => {
      const event = events.find((item) => item.id === quote.eventId);
      const client = event ? getClient(event.clientId) : undefined;
      const paid = payments.filter((payment) => payment.quoteId === quote.id).reduce((total, payment) => total + payment.amount, 0);
      const missingDeposit = Math.max(quote.requiredDeposit - paid, 0);
      const total = quoteTotal(quote);

      return {
        clientName: client?.name ?? "Sin cliente",
        event,
        missingDeposit,
        paid,
        quote,
        total,
      };
    })
    .sort((a, b) => {
      if (a.missingDeposit > 0 && b.missingDeposit === 0) {
        return -1;
      }

      if (a.missingDeposit === 0 && b.missingDeposit > 0) {
        return 1;
      }

      return (a.event?.date ?? "").localeCompare(b.event?.date ?? "");
    });
  const pendingDeposits = depositRows.filter((row) => row.missingDeposit > 0);
  const coveredDeposits = depositRows.filter((row) => row.missingDeposit === 0);

  function getClient(clientId: string) {
    return clients.find((client) => client.id === clientId);
  }

  return (
    <>
      <header className="pageHeader">
        <div>
          <h1>Pagos</h1>
          <p>Seguimiento de señas pendientes, señas registradas y pagos por evento.</p>
        </div>
        <a className="button primary" href="#nuevo-pago">
          Registrar pago
        </a>
      </header>

      <section className="grid columns3" aria-label="Resumen de señas" style={{ marginBottom: 16 }}>
        <article className="panel panelBody metric">
          <span>Señas pendientes</span>
          <strong>{pendingDeposits.length}</strong>
        </article>
        <article className="panel panelBody metric">
          <span>Señas cubiertas</span>
          <strong>{coveredDeposits.length}</strong>
        </article>
        <article className="panel panelBody metric">
          <span>Monto pendiente de señas</span>
          <strong>{formatCurrency(pendingDeposits.reduce((total, row) => total + row.missingDeposit, 0))}</strong>
        </article>
      </section>

      <section className="panel" style={{ marginBottom: 16 }}>
        <div className="panelHeader">
          <h2>Estado de señas</h2>
          <span className="muted">Pendientes primero</span>
        </div>
        <div className="depositStatusList">
          {depositRows.map((row) => (
            <article className={`depositStatusCard ${row.missingDeposit === 0 ? "isCovered" : "isPending"}`} key={row.quote.id}>
              <div>
                <strong>{row.clientName}</strong>
                <p className="muted">{row.event ? `${formatDate(row.event.date)} - ${row.event.turn}` : "Evento no encontrado"}</p>
              </div>
              <div>
                <span>Seña requerida</span>
                <strong>{formatCurrency(row.quote.requiredDeposit)}</strong>
              </div>
              <div>
                <span>Registrado</span>
                <strong>{formatCurrency(row.paid)}</strong>
              </div>
              <div>
                <span>Total cotizado</span>
                <strong>{formatCurrency(row.total)}</strong>
              </div>
              <div>
                <span>Estado</span>
                {row.missingDeposit === 0 ? (
                  <strong className="statusText success">Seña cubierta</strong>
                ) : (
                  <strong className="statusText warning">Faltan {formatCurrency(row.missingDeposit)}</strong>
                )}
              </div>
            </article>
          ))}
          {depositRows.length === 0 ? <p className="muted serviceEmptyState">Todavía no hay cotizaciones para seguir señas.</p> : null}
        </div>
      </section>

      <section className="panel" id="nuevo-pago" style={{ marginBottom: 16 }}>
        <div className="panelHeader">
          <h2>Nuevo pago</h2>
        </div>
        <form action={createPayment} className="panelBody formGrid">
          <div className="field">
            <label htmlFor="event">Evento</label>
            <select id="event" name="eventId">
              {eventsWithQuote.map((event) => {
                const client = getClient(event.clientId);
                return (
                  <option key={event.id} value={event.id}>
                    {formatDate(event.date)} - {event.turn} - {client?.name}
                  </option>
                );
              })}
            </select>
          </div>
          <div className="field">
            <label htmlFor="amount">Monto</label>
            <MoneyInput id="amount" name="amount" placeholder="Ej: 100.000" />
          </div>
          <div className="field">
            <label htmlFor="method">Medio</label>
            <select id="method" name="method">
              <option>EFECTIVO</option>
              <option>TRANSFERENCIA</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="paidAt">Fecha</label>
            <input id="paidAt" name="paidAt" type="date" />
          </div>
          <div className="field fullWidth">
            <label htmlFor="note">Observación</label>
            <input id="note" name="note" placeholder="Opcional" />
          </div>
          <div className="formActions">
            <button className="button primary" type="submit">
              Guardar pago
            </button>
          </div>
        </form>
      </section>

      <section className="panel">
        <div className="tableWrap">
          <table className="responsiveTable">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Evento</th>
                <th>Medio</th>
                <th>Monto</th>
                <th>Observación</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => {
                const event = events.find((item) => item.id === payment.eventId);
                const client = event ? getClient(event.clientId) : undefined;

                return (
                  <tr key={payment.id}>
                    <td data-label="Fecha">{formatDate(payment.paidAt)}</td>
                    <td data-label="Cliente">{client?.name}</td>
                    <td data-label="Evento">{event ? `${formatDate(event.date)} - ${event.turn}` : "Sin evento"}</td>
                    <td data-label="Medio">{payment.method}</td>
                    <td data-label="Monto">{formatCurrency(payment.amount)}</td>
                    <td data-label="Observación">{payment.note}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
