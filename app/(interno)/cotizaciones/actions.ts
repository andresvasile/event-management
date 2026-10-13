"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

function slug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function isValidMoney(value: number) {
  return Number.isFinite(value) && value >= 0;
}

function moneyValue(formData: FormData, name: string) {
  const rawValue = String(formData.get(name) ?? "").trim();
  const normalizedValue = rawValue.replace(/\./g, "").replace(/,/g, ".");

  return Number(normalizedValue);
}

function isValidQuantity(value: number) {
  return Number.isInteger(value) && value >= 1;
}

export async function createQuote(formData: FormData) {
  const eventId = String(formData.get("eventId") ?? "");
  const requiredDeposit = moneyValue(formData, "requiredDeposit");
  const requiredUnitPrice = moneyValue(formData, "requiredUnitPrice");
  const conditions = String(formData.get("conditions") ?? "").trim();
  const selectedServiceIds = formData.getAll("serviceIds").map((value) => String(value));

  if (!eventId || !isValidMoney(requiredDeposit) || !isValidMoney(requiredUnitPrice)) {
    return;
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { client: true },
  });
  const requiredService = await prisma.service.findFirst({ where: { required: true, active: true } });
  const existingQuote = await prisma.quote.findFirst({ where: { eventId } });

  if (!event || !requiredService || existingQuote) {
    return;
  }

  const selectedServices = selectedServiceIds.length
    ? await prisma.service.findMany({
        where: { id: { in: selectedServiceIds }, active: true, required: false },
        orderBy: { name: "asc" },
      })
    : [];

  const optionalItems = selectedServices.map((service) => {
    const quantity = Number(formData.get(`quantity:${service.id}`) ?? 0);
    const unitPrice = moneyValue(formData, `unitPrice:${service.id}`);

    if (!isValidQuantity(quantity) || !isValidMoney(unitPrice)) {
      return null;
    }

    return {
      serviceId: service.id,
      serviceName: service.name,
      quantity,
      unitPrice,
    };
  });

  if (optionalItems.some((item) => item === null)) {
    return;
  }

  const validOptionalItems = optionalItems.filter((item) => item !== null);
  const quoteTotal = validOptionalItems.reduce(
    (total, item) => total + item.quantity * item.unitPrice,
    requiredUnitPrice,
  );

  if (requiredDeposit > quoteTotal) {
    redirect("/cotizaciones?error=deposit-over-total#nueva-cotizacion");
  }

  await prisma.quote.create({
    data: {
      eventId,
      status: "ENVIADA",
      token: `${slug(event.client.name)}-${event.date.toISOString().slice(0, 10)}-${Date.now()}`,
      expiresAt: event.date,
      requiredDeposit,
      conditions: conditions || "La fecha se reserva solo al registrar la seña.",
      items: {
        create: [
          {
            serviceId: requiredService.id,
            serviceName: requiredService.name,
            quantity: 1,
            unitPrice: requiredUnitPrice,
            required: true,
          },
          ...validOptionalItems,
        ],
      },
    },
  });

  await prisma.event.update({ where: { id: eventId }, data: { status: "COTIZADO" } });

  revalidatePath("/cotizaciones");
  revalidatePath("/eventos");
  revalidatePath("/");
}

export async function acceptQuoteManually(formData: FormData) {
  const quoteId = String(formData.get("quoteId") ?? "");

  if (!quoteId) {
    return;
  }

  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: { event: true },
  });

  if (!quote || quote.status === "CANCELADA" || quote.status === "VENCIDA") {
    return;
  }

  await prisma.quote.update({ where: { id: quote.id }, data: { status: "ACEPTADA" } });

  if (quote.event.status !== "RESERVADO" && quote.event.status !== "CONFIRMADO") {
    await prisma.event.update({ where: { id: quote.eventId }, data: { status: "ACEPTADO" } });
  }

  revalidatePath("/cotizaciones");
  revalidatePath(`/q/${quote.token}`);
  revalidatePath("/eventos");
  revalidatePath("/");
}

export async function deleteQuote(formData: FormData) {
  const quoteId = String(formData.get("quoteId") ?? "");

  if (!quoteId) {
    return;
  }

  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: { event: true, payments: true },
  });

  if (!quote || quote.payments.length > 0) {
    return;
  }

  await prisma.quote.delete({ where: { id: quote.id } });

  if (quote.event.status === "COTIZADO" || quote.event.status === "ACEPTADO") {
    await prisma.event.update({ where: { id: quote.eventId }, data: { status: "CONSULTA" } });
  }

  revalidatePath("/cotizaciones");
  revalidatePath("/eventos");
  revalidatePath("/");
}
