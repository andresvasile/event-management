import type { Client, Event, EventType, Payment, Quote, Service } from "./domain";
import { toDateKey } from "./domain";
import { prisma } from "./prisma";

export async function getClients(): Promise<Client[]> {
  const clients = await prisma.client.findMany({ orderBy: { name: "asc" } });

  return clients.map((client) => ({
    id: client.id,
    name: client.name,
    phone: client.phone,
  }));
}

export async function getEventTypes(): Promise<EventType[]> {
  const eventTypes = await prisma.eventType.findMany({ orderBy: { name: "asc" } });

  return eventTypes.map((eventType) => ({
    id: eventType.id,
    name: eventType.name,
    active: eventType.active,
  }));
}

export async function getEvents(): Promise<Event[]> {
  const events = await prisma.event.findMany({
    include: { eventType: true },
    orderBy: [{ date: "asc" }, { turn: "asc" }],
  });

  return events.map((event) => ({
    id: event.id,
    clientId: event.clientId,
    date: toDateKey(event.date),
    turn: event.turn,
    status: event.status,
    eventType: event.eventType?.name ?? "Otro",
    guests: event.guests,
    notes: event.notes ?? undefined,
  }));
}

export async function getServices(): Promise<Service[]> {
  const services = await prisma.service.findMany({ orderBy: [{ required: "desc" }, { name: "asc" }] });

  return services.map((service) => ({
    id: service.id,
    name: service.name,
    basePrice: service.basePrice ?? undefined,
    active: service.active,
    required: service.required,
  }));
}

export async function getQuotes(): Promise<Quote[]> {
  const quotes = await prisma.quote.findMany({
    include: { items: { orderBy: { serviceName: "asc" } } },
    orderBy: { createdAt: "desc" },
  });

  return quotes.map((quote) => ({
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
}

export async function getQuoteByToken(token: string): Promise<Quote | null> {
  const quote = await prisma.quote.findUnique({
    where: { token },
    include: { items: { orderBy: { serviceName: "asc" } } },
  });

  if (!quote) {
    return null;
  }

  return {
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
  };
}

export async function getPayments(): Promise<Payment[]> {
  const payments = await prisma.payment.findMany({ orderBy: { paidAt: "desc" } });

  return payments.map((payment) => ({
    id: payment.id,
    eventId: payment.eventId,
    quoteId: payment.quoteId,
    amount: payment.amount,
    method: payment.method,
    paidAt: toDateKey(payment.paidAt),
    note: payment.note ?? undefined,
  }));
}
