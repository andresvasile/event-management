import Link from "next/link";
import { notFound } from "next/navigation";
import { formatCurrency, formatDate, formatTurn, toDateKey } from "@/lib/domain";
import { prisma } from "@/lib/prisma";
import { EventWorkspaceNav } from "../event-workspace-nav";
import { requireOrganization } from "@/lib/auth-guards";

export const dynamic = "force-dynamic";

type EventDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const { id } = await params;
  const { organizationId } = await requireOrganization();
  const event = await prisma.event.findFirst({
      where: { id, organizationId },
      include: {
        client: true,
        eventType: true,
        quotes: { include: { items: true }, orderBy: { createdAt: "desc" } },
        payments: { orderBy: { paidAt: "desc" } },
        graduationPeople: { select: { id: true, kind: true, amountDue: true, payments: { select: { amount: true } } } },
        graduationSchools: { select: { id: true } },
      },
    });

  if (!event) notFound();

  const quote = event.quotes[0];
  const quotedTotal = quote?.items.reduce((total, item) => total + item.quantity * item.unitPrice, 0) ?? 0;
  const paid = event.payments.reduce((total, payment) => total + payment.amount, 0);
  const graduationDue = event.graduationPeople.reduce((total, person) => total + person.amountDue, 0);
  const graduationPaid = event.graduationPeople.reduce(
    (total, person) => total + person.payments.reduce((personTotal, payment) => personTotal + payment.amount, 0),
    0,
  );
  const whatsappPhone = event.client.phone.replace(/\D/g, "");
  const whatsappMessage = encodeURIComponent(
    `Hola ${event.client.name}, te escribimos del salón por tu evento del ${formatDate(toDateKey(event.date))}.`,
  );

  return (
    <>
      <EventWorkspaceNav
        active="summary"
        event={{
          id: event.id,
          isGraduation: event.eventType?.supportsGraduationRoster ?? false,
          label: `${formatDate(toDateKey(event.date))} - ${formatTurn(event.turn)} - ${event.client.name} - ${event.eventType?.name ?? "Otro"}`,
        }}
      />

      <header className="pageHeader">
        <div>
          <h1>Resumen</h1>
          <p>Estado general y accesos a la gestión del evento.</p>
        </div>
        <Link className="button" href="/eventos">Volver al calendario</Link>
      </header>

      <section className="eventSummaryFacts" aria-label="Datos principales del evento">
        <div className="eventSummaryFact">
          <span>Estado</span>
          <strong className={`status${event.status}`}>{event.status}</strong>
        </div>
        <div className="eventSummaryFact">
          <span>Invitados estimados</span>
          <strong>{event.guests}</strong>
        </div>
        <div className="eventSummaryFact eventSummaryContact">
          <span>Teléfono</span>
          <div>
            <strong>{event.client.phone}</strong>
            <a
              className="button whatsappButton"
              href={`https://wa.me/${whatsappPhone}?text=${whatsappMessage}`}
              rel="noreferrer"
              target="_blank"
            >
              Enviar WhatsApp
            </a>
          </div>
        </div>
      </section>

      <section className="grid columns2">
        <article className="panel">
          <div className="panelHeader"><h2>Cotización y pagos</h2><Link className="button" href={`/cotizaciones?eventId=${event.id}`}>Abrir</Link></div>
          <dl className="panelBody compactSummaryList">
            <div><dt>Estado</dt><dd>{quote?.status ?? "Sin cotización"}</dd></div>
            <div><dt>Total cotizado</dt><dd>{formatCurrency(quotedTotal)}</dd></div>
            <div><dt>Pagado</dt><dd>{formatCurrency(paid)}</dd></div>
            <div><dt>Saldo</dt><dd>{formatCurrency(Math.max(quotedTotal - paid, 0))}</dd></div>
          </dl>
        </article>

        {event.eventType?.supportsGraduationRoster ? (
          <article className="panel">
            <div className="panelHeader"><h2>Padrón de egresados</h2><Link className="button" href={`/egresados?eventId=${event.id}&view=roster`}>Abrir padrón</Link></div>
            <dl className="panelBody compactSummaryList">
              <div><dt>Colegios</dt><dd>{event.graduationSchools.length}</dd></div>
              <div><dt>Egresados</dt><dd>{event.graduationPeople.filter((person) => person.kind === "EGRESADO").length}</dd></div>
              <div><dt>Familiares</dt><dd>{event.graduationPeople.filter((person) => person.kind === "FAMILIAR").length}</dd></div>
              <div><dt>Saldo de tarjetas</dt><dd>{formatCurrency(graduationDue - graduationPaid)}</dd></div>
            </dl>
          </article>
        ) : (
          <article className="panel">
            <div className="panelHeader"><h2>Notas</h2></div>
            <div className="panelBody"><p className="muted">{event.notes || "No hay observaciones cargadas para este evento."}</p></div>
          </article>
        )}
      </section>
    </>
  );
}
