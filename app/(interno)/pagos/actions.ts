"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { WorkflowError } from "@/lib/quote-workflow";
import { requireOrganization } from "@/lib/auth-guards";

function moneyValue(formData: FormData, name: string) {
  const rawValue = String(formData.get(name) ?? "").trim();
  const normalizedValue = rawValue.replace(/\./g, "").replace(/,/g, ".");

  return Number(normalizedValue);
}

export async function createPayment(formData: FormData) {
  const { organizationId } = await requireOrganization();
  const eventId = String(formData.get("eventId") ?? "");
  const amount = moneyValue(formData, "amount");
  const method = String(formData.get("method") ?? "");
  const paidAt = String(formData.get("paidAt") ?? "");
  const note = String(formData.get("note") ?? "").trim();

  const parsedDate = /^\d{4}-\d{2}-\d{2}$/.test(paidAt) ? new Date(`${paidAt}T00:00:00`) : null;

  if (!eventId || !Number.isInteger(amount) || amount < 1 || !parsedDate || Number.isNaN(parsedDate.getTime()) || (method !== "EFECTIVO" && method !== "TRANSFERENCIA")) {
    return;
  }
  let actionError: string | undefined;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await prisma.$transaction(async (tx) => {
        const quoteReference = await tx.quote.findFirst({ where: { eventId, event: { organizationId } }, select: { id: true } });
        if (!quoteReference) throw new WorkflowError("quote-not-found");

        await tx.$queryRaw`SELECT "id" FROM "Quote" WHERE "id" = ${quoteReference.id} FOR UPDATE`;
        const quote = await tx.quote.findUnique({
          where: { id: quoteReference.id },
          include: { event: true, items: { select: { quantity: true, unitPrice: true } } },
        });
        if (!quote || !["ENVIADA", "ACEPTADA"].includes(quote.status)) throw new WorkflowError("invalid-quote-status");
        const eventCanReceivePayment =
          (quote.status === "ENVIADA" && quote.event.status === "COTIZADO") ||
          (quote.status === "ACEPTADA" && ["ACEPTADO", "RESERVADO", "CONFIRMADO"].includes(quote.event.status));
        if (!eventCanReceivePayment) throw new WorkflowError("invalid-event-status");

        const total = quote.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
        const paid = (await tx.payment.aggregate({ where: { quoteId: quote.id }, _sum: { amount: true } }))._sum.amount ?? 0;
        if (amount > total - paid) throw new WorkflowError("payment-over-balance");

        const willReserve = quote.status === "ACEPTADA" && quote.event.status === "ACEPTADO" && paid < quote.requiredDeposit && paid + amount >= quote.requiredDeposit;
        await tx.payment.create({
          data: { eventId, quoteId: quote.id, amount, method, paidAt: parsedDate, note: note || undefined },
        });
        if (willReserve) await tx.event.update({ where: { id: eventId }, data: { status: "RESERVADO" } });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      actionError = undefined;
      break;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034" && attempt < 2) continue;
      if (error instanceof WorkflowError) actionError = error.code;
      else if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") actionError = "turn-unavailable";
      else actionError = "save-failed";
      break;
    }
  }

  if (actionError) redirect(`/pagos?eventId=${eventId}&error=${actionError}#nuevo-pago`);

  revalidatePath("/pagos");
  revalidatePath("/eventos");
  revalidatePath("/");
}
