import type { Prisma } from "@prisma/client";

export class WorkflowError extends Error {
  constructor(public readonly code: string) {
    super(code);
  }
}

async function quoteIsExpired(tx: Prisma.TransactionClient, quoteId: string) {
  const rows = await tx.$queryRaw<Array<{ expired: boolean }>>`
    SELECT (CURRENT_DATE > "expiresAt") AS expired
    FROM "Quote"
    WHERE "id" = ${quoteId}
  `;

  return rows[0]?.expired ?? true;
}

export async function acceptQuote(
  tx: Prisma.TransactionClient,
  where: { id: string } | { token: string },
  allowRejected = false,
  organizationId?: string,
) {
  const quote = await tx.quote.findUnique({ where, select: { id: true } });

  if (!quote) throw new WorkflowError("quote-not-found");

  await tx.$queryRaw`SELECT "id" FROM "Quote" WHERE "id" = ${quote.id} FOR UPDATE`;
  const lockedQuote = await tx.quote.findUnique({
    where: { id: quote.id },
    include: { event: true, payments: { select: { amount: true } } },
  });
  const allowedStatuses = allowRejected ? ["ENVIADA", "RECHAZADA"] : ["ENVIADA"];

  if (!lockedQuote || !allowedStatuses.includes(lockedQuote.status)) {
    throw new WorkflowError("invalid-quote-status");
  }
  if (organizationId && lockedQuote.event.organizationId !== organizationId) {
    throw new WorkflowError("quote-not-found");
  }
  if (lockedQuote.event.status !== "COTIZADO") {
    throw new WorkflowError("invalid-event-status");
  }
  if (await quoteIsExpired(tx, lockedQuote.id)) {
    throw new WorkflowError("quote-expired");
  }

  await tx.quote.update({ where: { id: lockedQuote.id }, data: { status: "ACEPTADA" } });
  const paid = lockedQuote.payments.reduce((sum, payment) => sum + payment.amount, 0);
  await tx.event.update({
    where: { id: lockedQuote.eventId },
    data: { status: paid >= lockedQuote.requiredDeposit ? "RESERVADO" : "ACEPTADO" },
  });

  return lockedQuote;
}

export async function rejectQuote(tx: Prisma.TransactionClient, token: string) {
  const quote = await tx.quote.findUnique({ where: { token }, select: { id: true } });

  if (!quote) throw new WorkflowError("quote-not-found");

  await tx.$queryRaw`SELECT "id" FROM "Quote" WHERE "id" = ${quote.id} FOR UPDATE`;
  const lockedQuote = await tx.quote.findUnique({ where: { id: quote.id }, include: { event: true } });

  if (!lockedQuote || lockedQuote.status !== "ENVIADA" || lockedQuote.event.status !== "COTIZADO") {
    throw new WorkflowError("invalid-quote-status");
  }
  if (await quoteIsExpired(tx, lockedQuote.id)) {
    throw new WorkflowError("quote-expired");
  }

  await tx.quote.update({ where: { id: lockedQuote.id }, data: { status: "RECHAZADA" } });

  return lockedQuote;
}
