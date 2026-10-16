import { notFound } from "next/navigation";
import { formatCurrency, formatDate, formatTurn, toDateKey } from "@/lib/domain";
import { prisma } from "@/lib/prisma";
import { acceptPublicQuote, rejectPublicQuote } from "./actions";

export const dynamic = "force-dynamic";

function publicStatusLabel(status: string, reserved: boolean, expired: boolean) {
  if (reserved) {
    return "Reserva realizada";
  }

  if (status === "ACEPTADA") {
    return "Cotización aceptada";
  }

  if (status === "RECHAZADA") {
    return "Cotización rechazada";
  }

  if (status === "VENCIDA" || expired) return "Cotización vencida";
  if (status === "CANCELADA") return "Cotización cancelada";

  return "Pendiente de respuesta";
}

type PublicQuotePageProps = {
  params: Promise<{ token: string }>;
};

export default async function PublicQuotePage({ params }: PublicQuotePageProps) {
  const { token } = await params;
  const quote = await prisma.quote.findUnique({
    where: { token },
    include: {
      event: { include: { client: true, eventType: true } },
      items: { orderBy: { serviceName: "asc" } },
      payments: { select: { amount: true } },
    },
  });

  if (!quote) {
    notFound();
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expired = today > quote.expiresAt && quote.status === "ENVIADA";
  const canRespond = quote.status === "ENVIADA" && !expired;
  const total = quote.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const paid = quote.payments.reduce((sum, payment) => sum + payment.amount, 0);
  const reserved = quote.event.status === "RESERVADO" || quote.event.status === "CONFIRMADO";
  const statusLabel = publicStatusLabel(quote.status, reserved, expired);

  return (
    <main className="publicQuotePage">
      <section className="publicQuoteCard">
        <header className="publicQuoteHeader">
          <div>
            <span className="publicEyebrow">Cotización de evento</span>
            <h1>{quote.event.client.name}</h1>
            <p>Revisá la propuesta para tu evento. Si estás de acuerdo, podés aceptarla desde esta pantalla.</p>
          </div>
          <span className={`badge status${quote.status}`}>{statusLabel}</span>
        </header>

        <section className="publicSummaryGrid" aria-label="Resumen de la cotización">
          <div>
            <span>Fecha</span>
            <strong>{formatDate(toDateKey(quote.event.date))}</strong>
          </div>
          <div>
            <span>Turno</span>
            <strong>{formatTurn(quote.event.turn)}</strong>
          </div>
          <div>
            <span>Tipo</span>
            <strong>{quote.event.eventType?.name ?? "Evento"}</strong>
          </div>
          <div>
            <span>Vence</span>
            <strong>{formatDate(toDateKey(quote.expiresAt))}</strong>
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

        {expired || quote.status === "VENCIDA" ? (
          <section className="warningBox">Esta cotización venció. Comunicate con el salón para solicitar una actualización.</section>
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
