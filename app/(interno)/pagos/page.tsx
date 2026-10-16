import { formatCurrency, formatDate, formatTurn } from "@/lib/domain";
import { toDateKey } from "@/lib/domain";
import { prisma } from "@/lib/prisma";
import { PAGE_SIZE, parsePage } from "@/lib/pagination";
import { createPayment } from "./actions";
import { MoneyInput } from "../cotizaciones/money-input";
import { EventWorkspaceNav } from "../eventos/event-workspace-nav";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Pagination } from "../pagination";
import { requireOrganization } from "@/lib/auth-guards";

export const dynamic = "force-dynamic";

type PaymentsPageProps = {
  searchParams: Promise<{ error?: string; eventId?: string; page?: string }>;
};

const errorMessages: Record<string, string> = {
  "quote-not-found": "Primero tenés que crear la cotización.",
  "invalid-quote-status": "El estado actual de la cotización no permite registrar pagos.",
  "invalid-event-status": "El estado actual del evento no permite registrar pagos.",
  "payment-over-balance": "El pago no puede superar el saldo pendiente.",
  "turn-unavailable": "El turno fue reservado por otro evento. No se registró el pago.",
  "save-failed": "No se pudo registrar el pago. Intentá nuevamente.",
};

export default async function PaymentsPage({ searchParams }: PaymentsPageProps) {
  const { error, eventId, page: requestedPage } = await searchParams;
  const { organizationId } = await requireOrganization();
  const selectedEvent = eventId
    ? await prisma.event.findFirst({ where: { id: eventId, organizationId }, include: { client: true, eventType: true } })
    : null;

  if (!selectedEvent) {
    redirect("/eventos");
  }

  const quote = await prisma.quote.findUnique({ where: { eventId: selectedEvent.id }, include: { items: true } });
  const [paymentCount, paymentTotal] = await Promise.all([
    prisma.payment.count({ where: { eventId: selectedEvent.id } }),
    prisma.payment.aggregate({ where: { eventId: selectedEvent.id }, _sum: { amount: true } }),
  ]);
  const totalPages = Math.max(1, Math.ceil(paymentCount / PAGE_SIZE));
  const page = Math.min(parsePage(requestedPage), totalPages);
  const eventPayments = await prisma.payment.findMany({
    where: { eventId: selectedEvent.id },
    orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });
  const paid = paymentTotal._sum.amount ?? 0;
  const total = quote ? quote.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0) : 0;
  const missingDeposit = quote ? Math.max(quote.requiredDeposit - paid, 0) : 0;
  const canRegisterPayment = quote
    ? (quote.status === "ENVIADA" && selectedEvent.status === "COTIZADO") ||
      (quote.status === "ACEPTADA" && ["ACEPTADO", "RESERVADO", "CONFIRMADO"].includes(selectedEvent.status))
    : false;

  return (
    <>
      <EventWorkspaceNav
        active="payments"
        event={{
          id: selectedEvent.id,
          isGraduation: selectedEvent.eventType?.supportsGraduationRoster ?? false,
          label: `${formatDate(toDateKey(selectedEvent.date))} - ${formatTurn(selectedEvent.turn)} - ${selectedEvent.client.name} - ${selectedEvent.eventType?.name ?? "Otro"}`,
        }}
      />

      <header className="pageHeader">
        <div>
          <h1>Pagos</h1>
          <p>Seña, movimientos registrados y saldo pendiente.</p>
        </div>
        {canRegisterPayment ? <a className="button primary" href="#nuevo-pago">Registrar pago</a> : null}
      </header>

      {error && errorMessages[error] ? <div className="warningBox" style={{ marginBottom: 16 }}>{errorMessages[error]}</div> : null}

      <section className="grid columns3" aria-label="Resumen de señas" style={{ marginBottom: 16 }}>
        <article className="panel panelBody metric">
          <span>Seña requerida</span>
          <strong>{formatCurrency(quote?.requiredDeposit ?? 0)}</strong>
        </article>
        <article className="panel panelBody metric">
          <span>Total pagado</span>
          <strong>{formatCurrency(paid)}</strong>
        </article>
        <article className="panel panelBody metric">
          <span>Saldo pendiente</span>
          <strong>{formatCurrency(Math.max(total - paid, 0))}</strong>
        </article>
      </section>

      {quote ? (
        <div className={missingDeposit === 0 ? "noticeBox" : "warningBox"} style={{ marginBottom: 16 }}>
          {missingDeposit === 0 ? "La seña está cubierta." : `Faltan ${formatCurrency(missingDeposit)} para cubrir la seña.`}
        </div>
      ) : (
        <div className="warningBox" style={{ marginBottom: 16 }}>
          Primero tenés que crear la cotización. <Link href={`/cotizaciones?eventId=${selectedEvent.id}`}>Ir a Cotización</Link>
        </div>
      )}

      {canRegisterPayment ? <section className="panel" id="nuevo-pago" style={{ marginBottom: 16 }}>
        <div className="panelHeader">
          <h2>Nuevo pago</h2>
        </div>
        <form action={createPayment} className="panelBody formGrid">
          <input name="eventId" type="hidden" value={selectedEvent.id} />
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
      </section> : null}

      <section className="panel">
        <div className="panelHeader"><h2>Historial de pagos</h2></div>
        <div className="tableWrap">
          <table className="responsiveTable">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Medio</th>
                <th>Monto</th>
                <th>Observación</th>
              </tr>
            </thead>
            <tbody>
              {eventPayments.map((payment) => (
                  <tr key={payment.id}>
                    <td data-label="Fecha">{formatDate(toDateKey(payment.paidAt))}</td>
                    <td data-label="Medio">{payment.method}</td>
                    <td data-label="Monto">{formatCurrency(payment.amount)}</td>
                    <td data-label="Observación">{payment.note}</td>
                  </tr>
              ))}
            </tbody>
          </table>
        </div>
        {eventPayments.length === 0 ? <p className="muted serviceEmptyState">Todavía no hay pagos registrados.</p> : null}
        <Pagination page={page} pageParam="page" pageSize={PAGE_SIZE} pathname="/pagos" searchParams={{ eventId: selectedEvent.id }} totalItems={paymentCount} />
      </section>
    </>
  );
}
