import Link from "next/link";
import { formatCurrency, formatDate, formatTurn, toDateKey } from "@/lib/domain";
import { prisma } from "@/lib/prisma";
import { PAGE_SIZE, parsePage } from "@/lib/pagination";
import { Pagination } from "./pagination";
import { requireOrganization } from "@/lib/auth-guards";

export const dynamic = "force-dynamic";

type DashboardPageProps = { searchParams: Promise<{ balancePage?: string; depositPage?: string }> };
type DepositRow = { id: string; eventId: string; clientName: string; date: Date; turn: string; paid: number; missing: number };
type BalanceRow = { id: string; clientName: string; status: string; token: string; total: number; paid: number; balance: number };

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams;
  const { organizationId } = await requireOrganization();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const [activeEvents, quotedRows, paymentTotal, upcomingEvents, depositCountRows, balanceCount] = await Promise.all([
    prisma.event.count({ where: { organizationId, status: { notIn: ["CANCELADO", "FINALIZADO"] } } }),
    prisma.$queryRaw<Array<{ total: number }>>`
      SELECT COALESCE(SUM(i."quantity" * i."unitPrice"), 0)::integer AS total
      FROM "QuoteItem" i JOIN "Quote" q ON q."id" = i."quoteId" JOIN "Event" e ON e."id" = q."eventId"
      WHERE e."organizationId" = ${organizationId}
    `,
    prisma.payment.aggregate({ where: { event: { organizationId } }, _sum: { amount: true } }),
    prisma.event.findMany({
      where: { organizationId, date: { gte: today }, status: { notIn: ["CANCELADO", "FINALIZADO"] } },
      include: { client: true },
      orderBy: [{ date: "asc" }, { turn: "asc" }],
      take: 5,
    }),
    prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*)::integer AS count
      FROM "Quote" q
      JOIN "Event" e ON e."id" = q."eventId"
      WHERE q."status" = 'ACEPTADA'
        AND e."organizationId" = ${organizationId}
        AND COALESCE((SELECT SUM(p."amount") FROM "Payment" p WHERE p."quoteId" = q."id"), 0) < q."requiredDeposit"
    `,
    prisma.quote.count({ where: { event: { organizationId } } }),
  ]);
  const depositCount = depositCountRows[0]?.count ?? 0;
  const depositPage = Math.min(parsePage(params.depositPage), Math.max(1, Math.ceil(depositCount / PAGE_SIZE)));
  const balancePage = Math.min(parsePage(params.balancePage), Math.max(1, Math.ceil(balanceCount / PAGE_SIZE)));
  const [pendingDepositQuotes, balances, interestedCounts] = await Promise.all([
    prisma.$queryRaw<DepositRow[]>`
      SELECT q."id", e."id" AS "eventId", c."name" AS "clientName", e."date", e."turn"::text,
        COALESCE((SELECT SUM(p."amount") FROM "Payment" p WHERE p."quoteId" = q."id"), 0)::integer AS paid,
        (q."requiredDeposit" - COALESCE((SELECT SUM(p."amount") FROM "Payment" p WHERE p."quoteId" = q."id"), 0))::integer AS missing
      FROM "Quote" q
      JOIN "Event" e ON e."id" = q."eventId"
      JOIN "Client" c ON c."id" = e."clientId"
      WHERE q."status" = 'ACEPTADA'
        AND e."organizationId" = ${organizationId}
        AND COALESCE((SELECT SUM(p."amount") FROM "Payment" p WHERE p."quoteId" = q."id"), 0) < q."requiredDeposit"
      ORDER BY e."date" ASC, e."turn" ASC, q."id" ASC
      LIMIT ${PAGE_SIZE} OFFSET ${(depositPage - 1) * PAGE_SIZE}
    `,
    prisma.$queryRaw<BalanceRow[]>`
      SELECT q."id", c."name" AS "clientName", q."status"::text, q."token",
        COALESCE((SELECT SUM(i."quantity" * i."unitPrice") FROM "QuoteItem" i WHERE i."quoteId" = q."id"), 0)::integer AS total,
        COALESCE((SELECT SUM(p."amount") FROM "Payment" p WHERE p."quoteId" = q."id"), 0)::integer AS paid,
        (COALESCE((SELECT SUM(i."quantity" * i."unitPrice") FROM "QuoteItem" i WHERE i."quoteId" = q."id"), 0) -
         COALESCE((SELECT SUM(p."amount") FROM "Payment" p WHERE p."quoteId" = q."id"), 0))::integer AS balance
      FROM "Quote" q
      JOIN "Event" e ON e."id" = q."eventId"
      JOIN "Client" c ON c."id" = e."clientId"
      WHERE e."organizationId" = ${organizationId}
      ORDER BY e."date" DESC, q."createdAt" DESC, q."id" DESC
      LIMIT ${PAGE_SIZE} OFFSET ${(balancePage - 1) * PAGE_SIZE}
    `,
    Promise.all(upcomingEvents.map((event) => prisma.event.count({
      where: { organizationId, id: { not: event.id }, date: event.date, turn: event.turn, status: { notIn: ["CANCELADO", "FINALIZADO"] } },
    }))),
  ]);
  const quotedTotal = quotedRows[0]?.total ?? 0;
  const paid = paymentTotal._sum.amount ?? 0;

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
          <Link className="button" href="/eventos">
            Seleccionar evento
          </Link>
        </div>
      </header>

      <section className="grid columns3" aria-label="Indicadores principales">
        <article className="panel panelBody metric">
          <span>Eventos activos</span>
          <strong>{activeEvents}</strong>
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
                {upcomingEvents.map((event, index) => {
                  const interested = interestedCounts[index] ?? 0;
                  return (
                    <tr key={event.id}>
                      <td data-label="Fecha">{formatDate(toDateKey(event.date))}</td>
                      <td data-label="Turno">{formatTurn(event.turn)}</td>
                      <td data-label="Cliente">{event.client.name}</td>
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
              return (
                <div className="warningBox" key={quote.id}>
                  <strong>{quote.clientName}</strong>
                  <div>{formatDate(toDateKey(quote.date))} - {formatTurn(quote.turn)}</div>
                  <div>
                    Faltan {formatCurrency(quote.missing)} para cubrir la seña. Registrado: {formatCurrency(quote.paid)}.
                  </div>
                </div>
              );
            })}
            {pendingDepositQuotes.length === 0 ? <p className="muted">No hay señas pendientes.</p> : null}
          </div>
          <Pagination page={depositPage} pageParam="depositPage" pageSize={PAGE_SIZE} pathname="/" searchParams={{ balancePage: params.balancePage }} totalItems={depositCount} />
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
              {balances.map((quote) => {
                return (
                  <tr key={quote.id}>
                    <td data-label="Cliente">{quote.clientName}</td>
                    <td data-label="Estado">
                      <span className={`badge status${quote.status}`}>{quote.status}</span>
                    </td>
                    <td data-label="Total">{formatCurrency(quote.total)}</td>
                    <td data-label="Pagado">{formatCurrency(quote.paid)}</td>
                    <td data-label="Saldo">{formatCurrency(quote.balance)}</td>
                    <td data-label="Link">
                      <Link href={`/q/${quote.token}`}>Ver pública</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pagination page={balancePage} pageParam="balancePage" pageSize={PAGE_SIZE} pathname="/" searchParams={{ depositPage: params.depositPage }} totalItems={balanceCount} />
      </section>
    </>
  );
}
