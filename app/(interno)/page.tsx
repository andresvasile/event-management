import Link from "next/link";
import { formatCurrency, formatDate, interestedCount, paidTotal, pendingBalance, quoteTotal } from "@/lib/domain";
import { getClients, getEvents, getPayments, getQuotes } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [clients, events, payments, quotes] = await Promise.all([getClients(), getEvents(), getPayments(), getQuotes()]);
  const upcomingEvents = [...events].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5);
  const pendingDepositQuotes = quotes.filter(
    (quote) => quote.status === "ACEPTADA" && paidTotal(quote.eventId, payments) < quote.requiredDeposit,
  );
  const quotedTotal = quotes.reduce((total, quote) => total + quoteTotal(quote), 0);
  const paid = payments.reduce((total, payment) => total + payment.amount, 0);

  function getClient(clientId: string) {
    return clients.find((client) => client.id === clientId);
  }

  return (
    <>
      <header className="pageHeader">
        <div>
          <h1>Dashboard</h1>
          <p>Resumen operativo de consultas, cotizaciones, reservas y pagos.</p>
        </div>
        <div className="buttonRow">
          <Link className="button primary" href="/eventos">
            Nuevo evento
          </Link>
          <Link className="button" href="/cotizaciones">
            Ver cotizaciones
          </Link>
        </div>
      </header>

      <section className="grid columns3" aria-label="Indicadores principales">
        <article className="panel panelBody metric">
          <span>Eventos activos</span>
          <strong>{events.filter((event) => event.status !== "CANCELADO" && event.status !== "FINALIZADO").length}</strong>
        </article>
        <article className="panel panelBody metric">
          <span>Cotizado</span>
          <strong>{formatCurrency(quotedTotal)}</strong>
        </article>
        <article className="panel panelBody metric">
          <span>Pagos registrados</span>
          <strong>{formatCurrency(paid)}</strong>
        </article>
      </section>

      <section className="grid columns2" style={{ marginTop: 16 }}>
        <article className="panel">
          <div className="panelHeader">
            <h2>Proximos eventos</h2>
            <Link className="button" href="/eventos">
              Abrir agenda
            </Link>
          </div>
          <div className="tableWrap">
            <table className="responsiveTable">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Turno</th>
                  <th>Cliente</th>
                  <th>Estado</th>
                  <th>Interesados</th>
                </tr>
              </thead>
              <tbody>
                {upcomingEvents.map((event) => {
                  const client = getClient(event.clientId);
                  const interested = interestedCount(event, events);

                  return (
                    <tr key={event.id}>
                      <td data-label="Fecha">{formatDate(event.date)}</td>
                      <td data-label="Turno">{event.turn}</td>
                      <td data-label="Cliente">{client?.name}</td>
                      <td data-label="Estado">
                        <span className={`badge status${event.status}`}>{event.status}</span>
                      </td>
                      <td data-label="Interesados">{interested > 0 ? `${interested} más` : "Sin advertencias"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </article>

        <article className="panel">
          <div className="panelHeader">
            <h2>Señas pendientes</h2>
          </div>
          <div className="panelBody grid">
            {pendingDepositQuotes.map((quote) => {
              const event = events.find((item) => item.id === quote.eventId);
              const client = event ? getClient(event.clientId) : undefined;
              const paidForEvent = event ? paidTotal(event.id, payments) : 0;
              const missingDeposit = quote.requiredDeposit - paidForEvent;

              return (
                <div className="warningBox" key={quote.id}>
                  <strong>{client?.name}</strong>
                  <div>{event ? `${formatDate(event.date)} - ${event.turn}` : "Evento no encontrado"}</div>
                  <div>
                    Faltan {formatCurrency(missingDeposit)} para cubrir la seña. Registrado: {formatCurrency(paidForEvent)}.
                  </div>
                </div>
              );
            })}
            {pendingDepositQuotes.length === 0 ? <p className="muted">No hay señas pendientes.</p> : null}
          </div>
        </article>
      </section>

      <section className="panel" style={{ marginTop: 16 }}>
        <div className="panelHeader">
          <h2>Saldos de cotizaciones</h2>
        </div>
        <div className="tableWrap">
            <table className="responsiveTable">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Estado</th>
                <th>Total</th>
                <th>Pagado</th>
                <th>Saldo</th>
                <th>Link</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((quote) => {
                const event = events.find((item) => item.id === quote.eventId);
                const client = event ? clients.find((item) => item.id === event.clientId) : undefined;

                return (
                  <tr key={quote.id}>
                    <td data-label="Cliente">{client?.name}</td>
                    <td data-label="Estado">
                      <span className={`badge status${quote.status}`}>{quote.status}</span>
                    </td>
                    <td data-label="Total">{formatCurrency(quoteTotal(quote))}</td>
                    <td data-label="Pagado">{formatCurrency(paidTotal(quote.eventId, payments))}</td>
                    <td data-label="Saldo">{formatCurrency(pendingBalance(quote, payments))}</td>
                    <td data-label="Link">
                      <Link href={`/q/${quote.token}`}>Ver pública</Link>
                    </td>
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
