export const EVENT_STATUSES = [
  "CONSULTA",
  "COTIZADO",
  "ACEPTADO",
  "RESERVADO",
  "CONFIRMADO",
  "CANCELADO",
  "FINALIZADO",
] as const;

export const QUOTE_STATUSES = ["BORRADOR", "ENVIADA", "ACEPTADA", "RECHAZADA", "VENCIDA", "CANCELADA"] as const;

export const TURNS = ["MANANA", "TARDE", "NOCHE"] as const;

export type EventStatus = (typeof EVENT_STATUSES)[number];
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];
export type Turn = (typeof TURNS)[number];

export type Client = {
  id: string;
  name: string;
  phone: string;
};

export type Event = {
  id: string;
  clientId: string;
  date: string;
  turn: Turn;
  status: EventStatus;
  eventType: string;
  guests: number;
  notes?: string;
};

export type Service = {
  id: string;
  name: string;
  basePrice?: number;
  active: boolean;
  required?: boolean;
};

export type EventType = {
  id: string;
  name: string;
  active: boolean;
};

export type QuoteItem = {
  id: string;
  serviceName: string;
  quantity: number;
  unitPrice: number;
  required?: boolean;
};

export type Quote = {
  id: string;
  eventId: string;
  status: QuoteStatus;
  token: string;
  expiresAt: string;
  requiredDeposit: number;
  conditions: string;
  items: QuoteItem[];
};

export type Payment = {
  id: string;
  eventId: string;
  quoteId: string;
  amount: number;
  method: "EFECTIVO" | "TRANSFERENCIA";
  paidAt: string;
  note?: string;
};

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(
    new Date(`${value}T00:00:00`),
  );
}

export function formatMonth(value: Date) {
  return new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" }).format(value);
}

export function toDateKey(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function quoteTotal(quote: Quote) {
  return quote.items.reduce((total, item) => total + item.quantity * item.unitPrice, 0);
}

export function paidTotal(eventId: string, payments: Payment[]) {
  return payments.filter((payment) => payment.eventId === eventId).reduce((total, payment) => total + payment.amount, 0);
}

export function pendingBalance(quote: Quote, payments: Payment[]) {
  return quoteTotal(quote) - paidTotal(quote.eventId, payments);
}

export function hasBlockingConflict(target: Event, events: Event[]) {
  return events.some(
    (event) =>
      event.id !== target.id &&
      event.date === target.date &&
      event.turn === target.turn &&
      (event.status === "RESERVADO" || event.status === "CONFIRMADO"),
  );
}

export function interestedCount(target: Event, events: Event[]) {
  return events.filter(
    (event) =>
      event.id !== target.id &&
      event.date === target.date &&
      event.turn === target.turn &&
      event.status !== "CANCELADO" &&
      event.status !== "FINALIZADO",
  ).length;
}
