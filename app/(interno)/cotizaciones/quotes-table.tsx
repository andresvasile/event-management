"use client";

import Link from "next/link";
import { useState } from "react";
import type { Client, Event, Payment, Quote } from "@/lib/domain";
import { formatCurrency, formatDate, paidTotal, pendingBalance, quoteTotal } from "@/lib/domain";
import { acceptQuoteManually, deleteQuote } from "./actions";

type QuotesTableProps = {
  clients: Client[];
  events: Event[];
  payments: Payment[];
  quotes: Quote[];
};

export function QuotesTable({ clients, events, payments, quotes }: QuotesTableProps) {
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const selectedQuote = quotes.find((quote) => quote.id === selectedQuoteId);
  const selectedEvent = selectedQuote ? events.find((event) => event.id === selectedQuote.eventId) : undefined;
  const selectedClient = selectedEvent ? clients.find((client) => client.id === selectedEvent.clientId) : undefined;

  return (
    <>
      <section className="panel">
        <div className="tableWrap">
          <table className="responsiveTable">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Evento</th>
                <th>Estado</th>
                <th>Total</th>
                <th>Seña requerida</th>
                <th>Pagado</th>
                <th>Saldo</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((quote) => {
                const event = events.find((item) => item.id === quote.eventId);
                const client = event ? clients.find((item) => item.id === event.clientId) : undefined;
                const publicUrl = `/q/${quote.token}`;
                const paidForQuote = paidTotal(quote.eventId, payments);
                const whatsappText = encodeURIComponent(
                  `Hola ${client?.name}, te compartimos la cotización para tu evento del día ${
                    event ? formatDate(event.date) : ""
                  } en el turno ${event?.turn}. Podes verla y confirmarla desde este link: ${publicUrl}`,
                );

                return (
                  <tr key={quote.id}>
                    <td data-label="Cliente">{client?.name}</td>
                    <td data-label="Evento">{event ? `${formatDate(event.date)} - ${event.turn}` : "Sin evento"}</td>
                    <td data-label="Estado">
                      <span className="badge">{quote.status}</span>
                    </td>
                    <td data-label="Total">{formatCurrency(quoteTotal(quote))}</td>
                    <td data-label="Seña requerida">{formatCurrency(quote.requiredDeposit)}</td>
                    <td data-label="Pagado">{formatCurrency(paidForQuote)}</td>
                    <td data-label="Saldo">{formatCurrency(pendingBalance(quote, payments))}</td>
                    <td className="buttonRow actionCell" data-label="Acciones">
                      {quote.status === "ENVIADA" || quote.status === "BORRADOR" || quote.status === "RECHAZADA" ? (
                        <form action={acceptQuoteManually}>
                          <input name="quoteId" type="hidden" value={quote.id} />
                          <button className="button primary" type="submit">
                            Aceptar
                          </button>
                        </form>
                      ) : null}
                      <button className="button" onClick={() => setSelectedQuoteId(quote.id)} type="button">
                        Ver detalle
                      </button>
                      <Link className="button" href={publicUrl}>
                        Ver link
                      </Link>
                      <a className="button" href={`https://wa.me/${client?.phone}?text=${whatsappText}`}>
                        WhatsApp
                      </a>
                      {paidForQuote === 0 ? (
                        <form action={deleteQuote}>
                          <input name="quoteId" type="hidden" value={quote.id} />
                          <button className="button danger" type="submit">
                            Borrar
                          </button>
                        </form>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {selectedQuote ? (
        <div className="modalBackdrop" role="presentation">
          <section aria-modal="true" className="modal" role="dialog">
            <div className="panelHeader">
              <div>
                <h2>Detalle de cotización</h2>
                <p className="muted">
                  {selectedClient?.name} - {selectedEvent ? `${formatDate(selectedEvent.date)} ${selectedEvent.turn}` : "Sin evento"}
                </p>
              </div>
              <button className="button" onClick={() => setSelectedQuoteId(null)} type="button">
                Cerrar
              </button>
            </div>
            <div className="panelBody grid">
              <div className="summaryLine">
                <span>Estado</span>
                <strong>{selectedQuote.status}</strong>
              </div>
              <div className="summaryLine">
                <span>Total</span>
                <strong>{formatCurrency(quoteTotal(selectedQuote))}</strong>
              </div>
              <div className="summaryLine">
                <span>Seña requerida</span>
                <strong>{formatCurrency(selectedQuote.requiredDeposit)}</strong>
              </div>
              <div className="summaryLine">
                <span>Saldo</span>
                <strong>{formatCurrency(pendingBalance(selectedQuote, payments))}</strong>
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
                    {selectedQuote.items.map((item) => (
                      <tr key={item.id}>
                        <td data-label="Item">
                          {item.serviceName} {item.required ? <span className="muted">(obligatorio)</span> : null}
                        </td>
                        <td data-label="Cantidad">{item.quantity}</td>
                        <td data-label="Precio">{formatCurrency(item.unitPrice)}</td>
                        <td data-label="Subtotal">{formatCurrency(item.quantity * item.unitPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="warningBox">La aceptación no bloquea la fecha hasta registrar la seña.</div>
              <p className="muted">{selectedQuote.conditions}</p>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
