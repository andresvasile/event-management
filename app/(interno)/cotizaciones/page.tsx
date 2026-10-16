import { formatDate, formatTurn, toDateKey } from "@/lib/domain";
import { getServices } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { QuotesTable } from "./quotes-table";
import { createQuote } from "./actions";
import { MoneyInput } from "./money-input";
import { QuoteItemsEditor } from "./quote-items-editor";
import { EventWorkspaceNav } from "../eventos/event-workspace-nav";
import { requireOrganization } from "@/lib/auth-guards";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type QuotesPageProps = {
  searchParams: Promise<{ error?: string; eventId?: string }>;
};

const errorMessages: Record<string, string> = {
  "deposit-over-total": "La seña requerida no puede ser mayor al total de la cotización.",
  "invalid-event-status": "El evento debe estar en Consulta para crear su cotización.",
  "required-service-missing": "No hay un alquiler obligatorio activo.",
  "invalid-services": "Alguno de los servicios seleccionados ya no está disponible.",
  "invalid-items": "Revisá cantidades y precios de los items.",
  "quote-exists": "Este evento ya tiene una cotización.",
  "save-failed": "No se pudo guardar la cotización. Intentá nuevamente.",
};

export default async function QuotesPage({ searchParams }: QuotesPageProps) {
  const { error, eventId } = await searchParams;
  const { organizationId } = await requireOrganization();
  const [eventRecord, services] = await Promise.all([
    eventId
      ? prisma.event.findUnique({
          where: { id: eventId, organizationId },
          include: {
            client: true,
            eventType: true,
            quotes: { include: { items: { orderBy: { serviceName: "asc" } }, payments: { orderBy: { paidAt: "desc" } } } },
          },
        })
      : null,
    getServices(organizationId),
  ]);

  if (!eventRecord) {
    redirect("/eventos");
  }

  const selectedEvent = {
    id: eventRecord.id,
    clientId: eventRecord.clientId,
    date: toDateKey(eventRecord.date),
    turn: eventRecord.turn,
    status: eventRecord.status,
    eventType: eventRecord.eventType?.name ?? "Otro",
    supportsGraduationRoster: eventRecord.eventType?.supportsGraduationRoster ?? false,
    guests: eventRecord.guests,
    notes: eventRecord.notes ?? undefined,
  };
  const client = { id: eventRecord.client.id, name: eventRecord.client.name, phone: eventRecord.client.phone };
  const eventQuotes = eventRecord.quotes.map((quote) => ({
    id: quote.id,
    eventId: quote.eventId,
    status: quote.status,
    token: quote.token,
    expiresAt: toDateKey(quote.expiresAt),
    requiredDeposit: quote.requiredDeposit,
    conditions: quote.conditions,
    items: quote.items.map((item) => ({
      id: item.id,
      serviceName: item.serviceName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      required: item.required,
    })),
  }));
  const eventPayments = eventRecord.quotes.flatMap((quote) => quote.payments.map((payment) => ({
    id: payment.id,
    eventId: payment.eventId,
    quoteId: payment.quoteId,
    amount: payment.amount,
    method: payment.method,
    paidAt: toDateKey(payment.paidAt),
    note: payment.note ?? undefined,
  })));
  const canCreateQuote = selectedEvent.status !== "CANCELADO" && selectedEvent.status !== "FINALIZADO" && eventQuotes.length === 0;
  const requiredService = services.find((service) => service.required && service.active);
  const optionalServices = services.filter((service) => !service.required && service.active);

  return (
    <>
      <EventWorkspaceNav
        active="quote"
        event={{
          id: selectedEvent.id,
          isGraduation: selectedEvent.supportsGraduationRoster ?? false,
          label: `${formatDate(selectedEvent.date)} - ${formatTurn(selectedEvent.turn)} - ${client?.name ?? "Sin cliente"} - ${selectedEvent.eventType}`,
        }}
      />

      <header className="pageHeader">
        <div>
          <h1>Cotización</h1>
          <p>Items, condiciones, aceptación y saldo.</p>
        </div>
        {canCreateQuote ? <a className="button primary" href="#nueva-cotizacion">Crear cotización</a> : null}
      </header>

      {canCreateQuote ? (
        <section className="panel" id="nueva-cotizacion" style={{ marginBottom: 16 }}>
          <div className="panelHeader"><h2>Nueva cotización</h2></div>
          {error && errorMessages[error] ? (
            <div className="warningBox" style={{ margin: 14, marginBottom: 0 }}>{errorMessages[error]}</div>
          ) : null}
          <form action={createQuote} className="panelBody formGrid">
            <input name="eventId" type="hidden" value={selectedEvent.id} />
            <div className="field">
              <label htmlFor="requiredDeposit">Seña requerida</label>
              <MoneyInput id="requiredDeposit" name="requiredDeposit" placeholder="Ej: 100.000" />
            </div>
            <div className="field fullWidth">
              <label htmlFor="conditions">Condiciones</label>
              <textarea id="conditions" name="conditions" placeholder="La fecha se reserva solo al registrar la seña." />
            </div>
            <div className="field fullWidth">
              <label>Items de la cotización</label>
              <QuoteItemsEditor optionalServices={optionalServices} requiredService={requiredService} />
            </div>
            <div className="formActions">
              <button className="button primary" disabled={!requiredService} type="submit">Guardar cotización</button>
            </div>
          </form>
        </section>
      ) : null}

      {eventQuotes.length > 0 ? (
        <QuotesTable appUrl={process.env.NEXT_PUBLIC_APP_URL ?? ""} client={client} event={selectedEvent} payments={eventPayments} quotes={eventQuotes} />
      ) : !canCreateQuote ? (
        <div className="warningBox">Este evento no tiene cotización y su estado actual no permite crear una nueva.</div>
      ) : null}
    </>
  );
}
