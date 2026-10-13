import { notFound } from "next/navigation";
import { formatCurrency, formatDate, paidTotal, quoteTotal } from "@/lib/domain";
import { getClients, getEvents, getPayments, getQuoteByToken } from "@/lib/data";
import { acceptPublicQuote, rejectPublicQuote } from "./actions";

export const dynamic = "force-dynamic";

function publicStatusLabel(status: string, reserved: boolean) {
  if (reserved) {
    return "Reserva realizada";
  }

  if (status === "ACEPTADA") {
    return "Cotización aceptada";
  }

  if (status === "RECHAZADA") {
    return "Cotización rechazada";
  }

  return "Pendiente de respuesta";
}

type PublicQuotePageProps = {
  params: Promise<{ token: string }>;
};

export default async function PublicQuotePage({ params }: PublicQuotePageProps) {
  const { token } = await params;
  const [clients, events, payments, quote] = await Promise.all([getClients(), getEvents(), getPayments(), getQuoteByToken(token)]);

  if (!quote) {
    notFound();
  }

  const event = events.find((item) => item.id === quote.eventId);
  const client = event ? clients.find((item) => item.id === event.clientId) : undefined;
  const canRespond = quote.status === "ENVIADA" || quote.status === "BORRADOR";
  const total = quoteTotal(quote);
  const paid = event ? paidTotal(event.id, payments) : 0;
  const reserved = paid >= quote.requiredDeposit;
  const statusLabel = publicStatusLabel(quote.status, reserved);

  return (
    <main className="publicQuotePage">
      <section className="publicQuoteCard">
        <header className="publicQuoteHeader">
          <div>
            <span className="publicEyebrow">Cotización de evento</span>
            <h1>{client?.name ?? "Cliente"}</h1>
            <p>Revisá la propuesta para tu evento. Si estás de acuerdo, podés aceptarla desde esta pantalla.</p>
          </div>
          <span className={`badge status${quote.status}`}>{statusLabel}</span>
        </header>

        <section className="publicSummaryGrid" aria-label="Resumen de la cotización">
          <div>
            <span>Fecha</span>
            <strong>{event ? formatDate(event.date) : "Sin fecha"}</strong>
          </div>
          <div>
            <span>Turno</span>
            <strong>{event?.turn ?? "Sin turno"}</strong>
          </div>
          <div>
            <span>Tipo</span>
            <strong>{event?.eventType ?? "Evento"}</strong>
          </div>
          <div>
            <span>Vence</span>
            <strong>{formatDate(quote.expiresAt)}</strong>
          </div>
        </section>

        {reserved ? (
          <section className="noticeBox">Reserva realizada. Ya tenemos registrada la seña para este evento.</section>
        ) : null}

        {!reserved && quote.status === "ACEPTADA" ? (
          <section className="noticeBox">Cotización aceptada. Tu respuesta quedó enviada al salón.</section>
        ) : null}

        {quote.status === "RECHAZADA" ? (
          <section className="warningBox">Cotización rechazada. Si querés revisar opciones, comunicate con el salón.</section>
        ) : null}

        <section className="publicQuoteBody">
          <article className="publicItemsPanel">
            <div className="publicSectionHeader">
              <h2>Detalle de la propuesta</h2>
              <span>{quote.items.length} conceptos</span>
            </div>
            <div className="tableWrap">
              <table className="publicItemsTable responsiveTable">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Cantidad</th>
                    <th>Precio</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {quote.items.map((item) => (
                    <tr key={item.id}>
                      <td data-label="Item">
                        <strong>{item.serviceName}</strong>
                      </td>
                      <td data-label="Cantidad">{item.quantity}</td>
                      <td data-label="Precio">{formatCurrency(item.unitPrice)}</td>
                      <td data-label="Subtotal">{formatCurrency(item.quantity * item.unitPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <aside className="publicTotalsPanel">
            <div>
              <span>Total</span>
              <strong>{formatCurrency(total)}</strong>
            </div>
            <div>
              <span>Seña requerida</span>
              <strong>{formatCurrency(quote.requiredDeposit)}</strong>
            </div>
            {paid > 0 ? (
              <div>
                <span>Seña registrada</span>
                <strong>{formatCurrency(paid)}</strong>
              </div>
            ) : null}
            <p>
              {reserved
                ? "Tu fecha ya figura reservada para el evento."
                : "Al aceptar, el salón recibe tu confirmación y coordina con vos el pago de la seña."}
            </p>
            {canRespond ? (
              <div className="publicActions">
                <form action={acceptPublicQuote}>
                  <input name="token" type="hidden" value={quote.token} />
                  <button className="button primary" type="submit">
                    Aceptar cotización
                  </button>
                </form>
                <form action={rejectPublicQuote}>
                  <input name="token" type="hidden" value={quote.token} />
                  <button className="button" type="submit">
                    Rechazar cotización
                  </button>
                </form>
              </div>
            ) : null}
          </aside>
        </section>

        <section className="publicConditions">
          <h2>Condiciones</h2>
          <p>{quote.conditions}</p>
        </section>
      </section>
    </main>
  );
}
