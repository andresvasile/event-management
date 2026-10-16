"use client";

import Link from "next/link";
import type { Client, Event, Payment, Quote } from "@/lib/domain";
import { formatCurrency, formatDate, formatTurn, paidTotal, pendingBalance, quoteTotal } from "@/lib/domain";
import { acceptQuoteManually, deleteQuote } from "./actions";

type QuotesTableProps = {
  appUrl: string;
  client: Client;
  event: Event;
  payments: Payment[];
  quotes: Quote[];
};

export function QuotesTable({ appUrl, client, event, payments, quotes }: QuotesTableProps) {
  const quote = quotes[0];

  if (!quote) return null;

  const publicPath = `/q/${quote.token}`;
  const publicUrl = appUrl ? `${appUrl.replace(/\/$/, "")}${publicPath}` : publicPath;
  const paidForQuote = paidTotal(quote.eventId, payments);
  const whatsappText = encodeURIComponent(
    `Hola ${client.name}, te compartimos la cotización para tu evento del día ${formatDate(event.date)} en el turno ${formatTurn(event.turn)}. Podes verla y confirmarla desde este link: ${publicUrl}`,
  );

  return (
    <section className="panel">
      <div className="panelHeader">
        <h2>Detalle</h2>
        <div className="buttonRow">
          {quote.status === "ENVIADA" || quote.status === "BORRADOR" || quote.status === "RECHAZADA" ? (
            <form action={acceptQuoteManually}>
              <input name="quoteId" type="hidden" value={quote.id} />
              <button className="button primary" type="submit">Aceptar</button>
            </form>
          ) : null}
          <Link className="button" href={publicPath}>Ver link</Link>
          <a className="button" href={`https://wa.me/${client.phone}?text=${whatsappText}`}>WhatsApp</a>
          {paidForQuote === 0 ? (
            <form action={deleteQuote}>
              <input name="quoteId" type="hidden" value={quote.id} />
              <button className="button danger" type="submit">Borrar</button>
            </form>
          ) : null}
        </div>
      </div>
      <div className="panelBody grid">
        <div className="eventInfoGrid">
          <div className="eventInfoCard"><span>Estado</span><strong>{quote.status}</strong></div>
          <div className="eventInfoCard"><span>Total</span><strong>{formatCurrency(quoteTotal(quote))}</strong></div>
          <div className="eventInfoCard"><span>Seña requerida</span><strong>{formatCurrency(quote.requiredDeposit)}</strong></div>
          <div className="eventInfoCard"><span>Pagado</span><strong>{formatCurrency(paidForQuote)}</strong></div>
          <div className="eventInfoCard"><span>Saldo</span><strong>{formatCurrency(pendingBalance(quote, payments))}</strong></div>
        </div>
        <div className="tableWrap">
          <table className="responsiveTable">
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
                    <td data-label="Item">{item.serviceName} {item.required ? <span className="muted">(obligatorio)</span> : null}</td>
                    <td data-label="Cantidad">{item.quantity}</td>
                    <td data-label="Precio">{formatCurrency(item.unitPrice)}</td>
                    <td data-label="Subtotal">{formatCurrency(item.quantity * item.unitPrice)}</td>
                  </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="warningBox">La aceptación no bloquea la fecha hasta registrar la seña.</div>
        <p className="muted">{quote.conditions}</p>
      </div>
    </section>
  );
}
