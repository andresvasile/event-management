import type { Client, Event, EventType, Payment, Quote, Service } from "./domain";

export const clients: Client[] = [
  { id: "cli-1", name: "Camila Alvarez", phone: "5491123456789" },
  { id: "cli-2", name: "Martin Rivas", phone: "5491165432100" },
  { id: "cli-3", name: "Laura Gomez", phone: "5491130303030" },
  { id: "cli-4", name: "Sofia Pereyra", phone: "5491177778888" },
];

export const events: Event[] = [
  {
    id: "evt-1",
    clientId: "cli-1",
    date: "2026-10-17",
    turn: "NOCHE",
    status: "COTIZADO",
    eventType: "Cumpleanos de 15",
    guests: 90,
    notes: "Pide opcion con DJ y decoracion.",
  },
  {
    id: "evt-2",
    clientId: "cli-2",
    date: "2026-10-17",
    turn: "NOCHE",
    status: "CONSULTA",
    eventType: "Casamiento civil",
    guests: 70,
  },
  {
    id: "evt-3",
    clientId: "cli-3",
    date: "2026-10-24",
    turn: "TARDE",
    status: "RESERVADO",
    eventType: "Bautismo",
    guests: 55,
  },
  {
    id: "evt-4",
    clientId: "cli-4",
    date: "2026-10-31",
    turn: "NOCHE",
    status: "ACEPTADO",
    eventType: "Egreso",
    guests: 120,
  },
];

export const services: Service[] = [
  { id: "srv-1", name: "Alquiler del salon", basePrice: 180000, active: true, required: true },
  { id: "srv-2", name: "Catering", basePrice: 4500, active: true },
  { id: "srv-3", name: "DJ", basePrice: 85000, active: true },
  { id: "srv-4", name: "Decoracion", basePrice: 65000, active: true },
  { id: "srv-5", name: "Mozos", basePrice: 25000, active: true },
];

export const eventTypes: EventType[] = [
  { id: "etype-1", name: "Cumple", active: true },
  { id: "etype-2", name: "Casamiento", active: true },
  { id: "etype-3", name: "Egreso", active: true },
  { id: "etype-4", name: "Otro", active: true },
];

export const quotes: Quote[] = [
  {
    id: "quo-1",
    eventId: "evt-1",
    status: "ENVIADA",
    token: "cotizacion-camila-1017",
    expiresAt: "2026-10-17",
    requiredDeposit: 100000,
    conditions: "La fecha se reserva solo al registrar la sena. Los precios corresponden a esta cotizacion.",
    items: [
      { id: "item-1", serviceName: "Alquiler del salon", quantity: 1, unitPrice: 180000, required: true },
      { id: "item-2", serviceName: "Catering", quantity: 90, unitPrice: 4500 },
      { id: "item-3", serviceName: "DJ", quantity: 1, unitPrice: 85000 },
    ],
  },
  {
    id: "quo-2",
    eventId: "evt-4",
    status: "ACEPTADA",
    token: "cotizacion-sofia-1031",
    expiresAt: "2026-10-31",
    requiredDeposit: 150000,
    conditions: "Pendiente de sena para bloquear el turno.",
    items: [
      { id: "item-4", serviceName: "Alquiler del salon", quantity: 1, unitPrice: 190000, required: true },
      { id: "item-5", serviceName: "Catering", quantity: 120, unitPrice: 4800 },
      { id: "item-6", serviceName: "Decoracion", quantity: 1, unitPrice: 65000 },
    ],
  },
];

export const payments: Payment[] = [
  {
    id: "pay-1",
    eventId: "evt-3",
    quoteId: "quo-reservado-demo",
    amount: 90000,
    method: "TRANSFERENCIA",
    paidAt: "2026-10-04",
    note: "Sena registrada.",
  },
];

export function getClient(clientId: string) {
  return clients.find((client) => client.id === clientId);
}

export function getEvent(eventId: string) {
  return events.find((event) => event.id === eventId);
}

export function getQuoteByEvent(eventId: string) {
  return quotes.find((quote) => quote.eventId === eventId);
}
