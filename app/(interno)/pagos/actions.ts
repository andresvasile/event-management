"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

function moneyValue(formData: FormData, name: string) {
  const rawValue = String(formData.get(name) ?? "").trim();
  const normalizedValue = rawValue.replace(/\./g, "").replace(/,/g, ".");

  return Number(normalizedValue);
}

export async function createPayment(formData: FormData) {
  const eventId = String(formData.get("eventId") ?? "");
  const amount = moneyValue(formData, "amount");
  const method = String(formData.get("method") ?? "");
  const paidAt = String(formData.get("paidAt") ?? "");
  const note = String(formData.get("note") ?? "").trim();

  if (!eventId || !Number.isFinite(amount) || amount < 1 || !paidAt || (method !== "EFECTIVO" && method !== "TRANSFERENCIA")) {
    return;
  }

  const quote = await prisma.quote.findFirst({
    where: { eventId },
    orderBy: { createdAt: "desc" },
    include: { payments: true },
  });

  if (!quote) {
    return;
  }

  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { date: true, turn: true } });

  if (!event) {
    return;
  }

  await prisma.payment.create({
    data: {
      eventId,
      quoteId: quote.id,
      amount,
      method,
      paidAt: new Date(`${paidAt}T00:00:00`),
      note: note || undefined,
    },
  });

  const paidTotal = quote.payments.reduce((total, payment) => total + payment.amount, 0) + amount;
  const blockingEvent = await prisma.event.findFirst({
    where: {
      id: { not: eventId },
      date: event.date,
      turn: event.turn,
      status: { in: ["RESERVADO", "CONFIRMADO"] },
    },
  });

  if (paidTotal >= quote.requiredDeposit && !blockingEvent) {
    await prisma.event.update({ where: { id: eventId }, data: { status: "RESERVADO" } });
  }

  revalidatePath("/pagos");
  revalidatePath("/eventos");
  revalidatePath("/");
}
