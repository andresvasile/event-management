import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { MonthCalendar } from "./month-calendar";
import { getClients, getEvents, getEventTypes, getPayments, getQuotes } from "@/lib/data";
import { createEvent } from "./actions";
import { EVENT_STATUSES, formatDate, formatTurn, todayDateKey, TURNS, toDateKey } from "@/lib/domain";
import { prisma } from "@/lib/prisma";
import { PAGE_SIZE, parsePage } from "@/lib/pagination";
import { Pagination } from "../pagination";
import { requireOrganization } from "@/lib/auth-guards";

export const dynamic = "force-dynamic";

type EventsPageProps = {
  searchParams: Promise<{
    dateFrom?: string;
    dateTo?: string;
    page?: string;
    q?: string;
    status?: string;
    turn?: string;
    view?: string;
  }>;
};

function validDate(value: string | undefined) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : undefined;
}

export default async function EventsPage({ searchParams }: EventsPageProps) {
  const params = await searchParams;
  const { organizationId } = await requireOrganization();
  const today = todayDateKey();
  const activeView = params.view === "list" ? "list" : "calendar";
  const [clients, eventTypes] = await Promise.all([getClients(organizationId), getEventTypes(organizationId)]);

  let calendar = null;
  let eventList = null;

  if (activeView === "calendar") {
    const [events, payments, quotes] = await Promise.all([getEvents(organizationId), getPayments(organizationId), getQuotes(organizationId)]);
    calendar = <MonthCalendar clients={clients} events={events} payments={payments} quotes={quotes} />;
  } else {
    const status = EVENT_STATUSES.find((item) => item === params.status);
    const turn = TURNS.find((item) => item === params.turn);
    const dateFrom = validDate(params.dateFrom);
    const dateTo = validDate(params.dateTo);
    const query = params.q?.trim();
    const where: Prisma.EventWhereInput = {
      organizationId,
      ...(status ? { status } : {}),
      ...(turn ? { turn } : {}),
      ...(dateFrom || dateTo ? { date: { ...(dateFrom ? { gte: dateFrom } : {}), ...(dateTo ? { lte: dateTo } : {}) } } : {}),
      ...(query
        ? {
            OR: [
              { client: { name: { contains: query, mode: "insensitive" } } },
              { client: { phone: { contains: query } } },
              { eventType: { name: { contains: query, mode: "insensitive" } } },
            ],
          }
        : {}),
    };
    const totalItems = await prisma.event.count({ where });
    const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
    const page = Math.min(parsePage(params.page), totalPages);
    const events = await prisma.event.findMany({
      where,
      include: { client: true, eventType: true },
      orderBy: [{ date: "asc" }, { turn: "asc" }, { createdAt: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    });

    eventList = (
      <section className="panel">
        <div className="panelHeader"><h2>Listado de eventos</h2><span className="muted">{totalItems} resultados</span></div>
        <form className="panelBody eventFilters" method="get">
          <input name="view" type="hidden" value="list" />
          <div className="field eventSearchField"><label htmlFor="q">Buscar</label><input defaultValue={params.q} id="q" name="q" placeholder="Cliente, teléfono o tipo" /></div>
          <div className="field"><label htmlFor="status">Estado</label><select defaultValue={status ?? ""} id="status" name="status"><option value="">Todos</option>{EVENT_STATUSES.map((item) => <option key={item}>{item}</option>)}</select></div>
          <div className="field"><label htmlFor="turnFilter">Turno</label><select defaultValue={turn ?? ""} id="turnFilter" name="turn"><option value="">Todos</option>{TURNS.map((item) => <option key={item} value={item}>{formatTurn(item)}</option>)}</select></div>
          <div className="field"><label htmlFor="dateFrom">Desde</label><input defaultValue={params.dateFrom} id="dateFrom" name="dateFrom" type="date" /></div>
          <div className="field"><label htmlFor="dateTo">Hasta</label><input defaultValue={params.dateTo} id="dateTo" name="dateTo" type="date" /></div>
          <div className="formActions buttonRow"><button className="button primary" type="submit">Buscar</button><Link className="button" href="/eventos?view=list">Limpiar</Link></div>
        </form>
        <div className="tableWrap">
          <table className="responsiveTable">
            <thead><tr><th>Fecha</th><th>Cliente</th><th>Tipo</th><th>Turno</th><th>Estado</th><th>Acción</th></tr></thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id}>
                  <td data-label="Fecha">{formatDate(toDateKey(event.date))}</td>
                  <td data-label="Cliente"><strong>{event.client.name}</strong><small>{event.client.phone}</small></td>
                  <td data-label="Tipo">{event.eventType?.name ?? "Otro"}</td>
                  <td data-label="Turno">{formatTurn(event.turn)}</td>
                  <td data-label="Estado"><span className={`badge status${event.status}`}>{event.status}</span></td>
                  <td data-label="Acción"><Link className="button" href={`/eventos/${event.id}`}>Abrir expediente</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {events.length === 0 ? <p className="muted serviceEmptyState">No hay eventos que coincidan con los filtros.</p> : null}
        <Pagination
          page={page}
          pageParam="page"
          pageSize={PAGE_SIZE}
          pathname="/eventos"
          searchParams={{ view: "list", q: params.q, status, turn, dateFrom: params.dateFrom, dateTo: params.dateTo }}
          totalItems={totalItems}
        />
      </section>
    );
  }

  return (
    <>
      <header className="pageHeader">
        <div>
          <h1>Eventos</h1>
          <p>Agenda por fecha y turno. Solo reservado o confirmado bloquea el turno.</p>
        </div>
        <a className="button primary" href="#alta-consulta">
          Crear consulta
        </a>
      </header>

      <nav aria-label="Vista de eventos" className="pageTabs">
        <Link aria-current={activeView === "calendar" ? "page" : undefined} href="/eventos">Calendario</Link>
        <Link aria-current={activeView === "list" ? "page" : undefined} href="/eventos?view=list">Listado</Link>
      </nav>

      <section className="panel" id="alta-consulta" style={{ marginBottom: 16 }}>
        <div className="panelHeader">
          <h2>Alta rápida de consulta</h2>
        </div>
        <form action={createEvent} className="panelBody formGrid">
          <div className="field">
            <label htmlFor="clientName">Cliente</label>
            <input id="clientName" name="clientName" placeholder="Nombre y apellido" />
          </div>
          <div className="field">
            <label htmlFor="phone">Teléfono</label>
            <input id="phone" name="phone" placeholder="549..." />
          </div>
          <div className="field">
            <label htmlFor="date">Fecha</label>
            <input id="date" min={today} name="date" required type="date" />
          </div>
          <div className="field">
            <label htmlFor="turn">Turno</label>
            <select id="turn" name="turn">
              {TURNS.map((item) => <option key={item} value={item}>{formatTurn(item)}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="eventType">Tipo de evento</label>
            <select id="eventType" name="eventTypeId">
              {eventTypes
                .filter((eventType) => eventType.active)
                .map((eventType) => (
                  <option key={eventType.id} value={eventType.id}>
                    {eventType.name}
                  </option>
                ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="guests">Invitados aproximados</label>
            <input id="guests" min="1" name="guests" type="number" />
          </div>
          <div className="formActions">
            <button className="button primary" type="submit">
              Guardar consulta
            </button>
          </div>
        </form>
      </section>

      {calendar}
      {eventList}
    </>
  );
}
