"use client";

import { useState } from "react";
import Link from "next/link";
import type { Event, Payment, Quote } from "@/lib/domain";
import {
  formatCurrency,
  formatDate,
  formatMonth,
  formatTurn,
  hasBlockingConflict,
  interestedCount,
  paidTotal,
  pendingBalance,
  quoteTotal,
  toDateKey,
} from "@/lib/domain";
import type { Client } from "@/lib/domain";

type MonthCalendarProps = {
  events: Event[];
  clients: Client[];
  payments: Payment[];
  quotes: Quote[];
};

type CalendarView = "month" | "week" | "threeDays";

function getMonthDays(monthDate: Date) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();

  return Array.from({ length: lastDay }, (_, index) => toDateKey(new Date(year, month, index + 1)));
}

function addDays(value: Date, days: number) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate() + days);
}

function getWeekDays(value: Date) {
  const day = value.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = addDays(value, mondayOffset);

  return Array.from({ length: 7 }, (_, index) => toDateKey(addDays(monday, index)));
}

function getThreeDays(value: Date) {
  return Array.from({ length: 3 }, (_, index) => toDateKey(addDays(value, index)));
}

export function MonthCalendar({ events, clients, payments, quotes }: MonthCalendarProps) {
  const [monthDate, setMonthDate] = useState(() => new Date());
  const [calendarView, setCalendarView] = useState<CalendarView>("month");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const visibleDays = calendarView === "month" ? getMonthDays(monthDate) : calendarView === "week" ? getWeekDays(monthDate) : getThreeDays(monthDate);
  const selectedMonth = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`;
  const selectedEvent = events.find((event) => event.id === selectedEventId);
  const selectedClient = selectedEvent ? clients.find((client) => client.id === selectedEvent.clientId) : undefined;
  const selectedQuote = selectedEvent ? quotes.find((quote) => quote.eventId === selectedEvent.id) : undefined;
  const monthStartColumn = ((new Date(monthDate.getFullYear(), monthDate.getMonth(), 1).getDay() + 6) % 7) + 1;

  function moveMonth(offset: number) {
    setMonthDate((current) => {
      if (calendarView === "month") {
        return new Date(current.getFullYear(), current.getMonth() + offset, 1);
      }

      return addDays(current, offset * (calendarView === "week" ? 7 : 3));
    });
  }

  function selectMonth(value: string) {
    const [year, month] = value.split("-").map(Number);

    if (!year || !month) {
      return;
    }

    setMonthDate(new Date(year, month - 1, 1));
  }

  function selectView(view: CalendarView) {
    setCalendarView(view);

    if (view === "threeDays") {
      setMonthDate(new Date());
    }
  }

  function clientName(clientId: string) {
    return clients.find((client) => client.id === clientId)?.name ?? "Cliente sin nombre";
  }

  return (
    <section className="panel">
      <div className="panelHeader">
        <h2>Calendario {formatMonth(monthDate)}</h2>
        <div className="calendarControls">
          <div className="calendarViewToggle" aria-label="Vista del calendario">
            <button className={`button ${calendarView === "month" ? "primary" : ""}`} onClick={() => selectView("month")} type="button">
              Mes
            </button>
            <button className={`button ${calendarView === "week" ? "primary" : ""}`} onClick={() => selectView("week")} type="button">
              Semana
            </button>
            <button className={`button ${calendarView === "threeDays" ? "primary" : ""}`} onClick={() => selectView("threeDays")} type="button">
              3 días
            </button>
          </div>
          <button aria-label="Período anterior" className="button iconButton" onClick={() => moveMonth(-1)} type="button">
            &lt;
          </button>
          <div className="field compactField">
            <label htmlFor="calendarMonth">Mes y año</label>
            <input id="calendarMonth" onChange={(event) => selectMonth(event.target.value)} type="month" value={selectedMonth} />
          </div>
          <button aria-label="Período siguiente" className="button iconButton" onClick={() => moveMonth(1)} type="button">
            &gt;
          </button>
          <button className="button" onClick={() => setMonthDate(new Date())} type="button">
            Hoy
          </button>
        </div>
      </div>
      <div className={`panelBody calendarGrid calendarView-${calendarView}`}>
        {visibleDays.map((date) => {
          const dayEvents = events.filter((event) => event.date === date);

          return (
            <article
              className="dayCell"
              key={date}
              style={calendarView === "month" && date === visibleDays[0] ? { gridColumnStart: monthStartColumn } : undefined}
            >
              <header>{formatDate(date)}</header>
              {dayEvents.map((event) => {
                const interested = interestedCount(event, events);
                const conflict = hasBlockingConflict(event, events);

                return (
                  <button className={`eventPill eventButton status${event.status}`} key={event.id} onClick={() => setSelectedEventId(event.id)} type="button">
                    <strong>
                      {formatTurn(event.turn)} - {clientName(event.clientId)}
                    </strong>
                    <span>{event.status}</span>
                    {interested > 0 ? <span>Advertencia: {interested} interesado(s)</span> : null}
                    {conflict && event.status !== "RESERVADO" && event.status !== "CONFIRMADO" ? <span>Turno bloqueado</span> : null}
                  </button>
                );
              })}
            </article>
          );
        })}
      </div>

      {selectedEvent ? (
        <div className="modalBackdrop" role="presentation">
          <section aria-modal="true" className="modal eventModal" role="dialog">
            <div className="panelHeader eventModalHeader">
              <div>
                <h2>Detalle del evento</h2>
                <p className="muted">
                  {selectedClient?.name} - {formatDate(selectedEvent.date)} - {formatTurn(selectedEvent.turn)}
                </p>
              </div>
              <div className="buttonRow">
                <Link className="button primary" href={`/eventos/${selectedEvent.id}`}>Abrir evento</Link>
                <button className="button" onClick={() => setSelectedEventId(null)} type="button">Cerrar</button>
              </div>
            </div>
            <div className="panelBody eventModalBody">
              <section className="eventInfoGrid" aria-label="Información del evento">
                <div className="eventInfoCard">
                  <span>Estado</span>
                  <strong className={`statusTextValue status${selectedEvent.status}`}>{selectedEvent.status}</strong>
                </div>
                <div className="eventInfoCard">
                  <span>Tipo de evento</span>
                  <strong>{selectedEvent.eventType}</strong>
                </div>
                <div className="eventInfoCard">
                  <span>Invitados</span>
                  <strong>{selectedEvent.guests}</strong>
                </div>
                <div className="eventInfoCard">
                  <span>Teléfono</span>
                  <strong>{selectedClient?.phone}</strong>
                </div>
              </section>
              {interestedCount(selectedEvent, events) > 0 ? (
                <div className="warningBox">Hay {interestedCount(selectedEvent, events)} interesado(s) más para esta fecha y turno.</div>
              ) : null}
              {hasBlockingConflict(selectedEvent, events) && selectedEvent.status !== "RESERVADO" && selectedEvent.status !== "CONFIRMADO" ? (
                <div className="warningBox">Este turno ya está bloqueado por otro evento reservado o confirmado.</div>
              ) : null}
              {selectedEvent.notes ? <p className="muted">Notas: {selectedEvent.notes}</p> : null}
              {selectedQuote ? (
                <div className="panel">
                  <div className="panelHeader">
                    <h2>Cotización</h2>
                    <Link className="button" href={`/q/${selectedQuote.token}`}>
                      Ver link público
                    </Link>
                  </div>
                  <div className="panelBody eventInfoGrid">
                    <div className="eventInfoCard">
                      <span>Estado</span>
                      <strong className={`statusTextValue status${selectedQuote.status}`}>{selectedQuote.status}</strong>
                    </div>
                    <div className="eventInfoCard">
                      <span>Total</span>
                      <strong>{formatCurrency(quoteTotal(selectedQuote))}</strong>
                    </div>
                    <div className="eventInfoCard">
                      <span>Pagado</span>
                      <strong>{formatCurrency(paidTotal(selectedEvent.id, payments))}</strong>
                    </div>
                    <div className="eventInfoCard">
                      <span>Saldo</span>
                      <strong>{formatCurrency(pendingBalance(selectedQuote, payments))}</strong>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="muted">Este evento todavía no tiene cotización cargada.</p>
              )}
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
