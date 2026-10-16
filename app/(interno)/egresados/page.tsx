import { Prisma } from "@prisma/client";
import { formatCurrency, formatDate, formatTurn, toDateKey } from "@/lib/domain";
import { prisma } from "@/lib/prisma";
import { PAGE_SIZE, parsePage } from "@/lib/pagination";
import {
  createGraduationPayment,
  createGraduationPerson,
  createGraduationSchool,
  enableGraduationEvent,
} from "./actions";
import { EventWorkspaceNav } from "../eventos/event-workspace-nav";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Pagination } from "../pagination";
import { requireOrganization } from "@/lib/auth-guards";

export const dynamic = "force-dynamic";

type GraduatesPageProps = {
  searchParams: Promise<{
    eventId?: string;
    q?: string;
    schoolId?: string;
    category?: string;
    paymentStatus?: string;
    view?: string;
    error?: string;
    page?: string;
  }>;
};

const categoryLabels = {
  COMPLETA: "Tarjeta completa",
  MENOR_SIN_CARGO: "0 a 2 años - sin cargo",
  MENOR_MITAD: "3 a 5 años - 50%",
  DISCAPACIDAD_SIN_CARGO: "Cupo discapacidad - sin cargo",
  DISCAPACIDAD_MITAD: "Discapacidad - 50%",
} as const;

const errorMessages: Record<string, string> = {
  "invalid-price": "Ingresá un precio de tarjeta completa válido.",
  "event-not-found": "No se encontró la fiesta seleccionada.",
  "event-not-enabled": "Primero configurá el precio de tarjeta de la fiesta.",
  "invalid-school": "Revisá el nombre o el colegio seleccionado.",
  "school-exists": "Ese colegio ya está cargado para esta fiesta.",
  "invalid-person": "Completá el nombre, apellido y tipo de persona.",
  "invalid-age": "La edad debe ser un número entre 0 y 120.",
  "invalid-graduate": "Seleccioná un egresado válido para el familiar.",
  "invalid-payment": "Completá correctamente el monto, medio y fecha del pago.",
  "payment-over-balance": "El pago no puede superar el saldo pendiente de esa persona.",
};

function paidTotal(person: { payments: { amount: number }[] }) {
  return person.payments.reduce((total, payment) => total + payment.amount, 0);
}

function paymentStatus(amountDue: number, paid: number) {
  if (amountDue === 0 || paid >= amountDue) return "PAGADO";
  if (paid > 0) return "PARCIAL";
  return "PENDIENTE";
}

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .trim();
}

export default async function GraduatesPage({ searchParams }: GraduatesPageProps) {
  const params = await searchParams;
  const { organizationId } = await requireOrganization();
  const activeView = params.view === "roster" ? "roster" : "setup";

  if (!params.eventId) {
    redirect("/eventos");
  }

  const selectedEvent = await prisma.event.findUnique({
    where: { id: params.eventId, organizationId },
    include: { client: true, eventType: true },
  });

  if (!selectedEvent || !selectedEvent.eventType?.supportsGraduationRoster) {
    redirect("/eventos");
  }

  const schools = await prisma.graduationSchool.findMany({
    where: { eventId: selectedEvent.id },
    orderBy: { name: "asc" },
  });
  const personConditions: Prisma.Sql[] = [];
  if (params.category) personConditions.push(Prisma.sql`p."priceCategory"::text = ${params.category}`);
  if (params.paymentStatus === "PENDIENTE") personConditions.push(Prisma.sql`COALESCE(pp.paid, 0) = 0 AND p."amountDue" > 0`);
  if (params.paymentStatus === "PARCIAL") personConditions.push(Prisma.sql`COALESCE(pp.paid, 0) > 0 AND COALESCE(pp.paid, 0) < p."amountDue"`);
  if (params.paymentStatus === "PAGADO") personConditions.push(Prisma.sql`p."amountDue" = 0 OR COALESCE(pp.paid, 0) >= p."amountDue"`);
  if (params.q?.trim()) {
    const search = `%${params.q.trim()}%`;
    personConditions.push(Prisma.sql`(
      p."firstName" ILIKE ${search} OR p."lastName" ILIKE ${search} OR
      COALESCE(p."relationship", '') ILIKE ${search} OR COALESCE(p."notes", '') ILIKE ${search} OR
      COALESCE(s."name", '') ILIKE ${search}
    )`);
  }

  const groupConditions: Prisma.Sql[] = [
    Prisma.sql`g."eventId" = ${selectedEvent.id}`,
    Prisma.sql`g."kind" = 'EGRESADO'::"GraduationPersonKind"`,
  ];
  if (params.schoolId) groupConditions.push(Prisma.sql`g."schoolId" = ${params.schoolId}`);
  if (personConditions.length > 0) {
    groupConditions.push(Prisma.sql`EXISTS (
      SELECT 1
      FROM "GraduationPerson" p
      LEFT JOIN "GraduationSchool" s ON s."id" = g."schoolId"
      LEFT JOIN (
        SELECT "personId", SUM("amount")::integer AS paid
        FROM "GraduationPayment"
        GROUP BY "personId"
      ) pp ON pp."personId" = p."id"
      WHERE (p."id" = g."id" OR p."graduateId" = g."id")
        AND ${Prisma.join(personConditions, " AND ")}
    )`);
  }

  const groupWhere = Prisma.sql`${Prisma.join(groupConditions, " AND ")}`;
  const groupCountRows = activeView === "roster"
    ? await prisma.$queryRaw<Array<{ count: number }>>(Prisma.sql`
        SELECT COUNT(*)::integer AS count FROM "GraduationPerson" g WHERE ${groupWhere}
      `)
    : [{ count: 0 }];
  const totalGroups = groupCountRows[0]?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalGroups / PAGE_SIZE));
  const page = Math.min(parsePage(params.page), totalPages);
  const groupRows = activeView === "roster"
    ? await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT g."id"
        FROM "GraduationPerson" g
        WHERE ${groupWhere}
        ORDER BY g."lastName" ASC, g."firstName" ASC, g."id" ASC
        LIMIT ${PAGE_SIZE} OFFSET ${(page - 1) * PAGE_SIZE}
      `)
    : [];
  const groupOrder = new Map(groupRows.map((row, index) => [row.id, index]));
  const graduates = await prisma.graduationPerson.findMany({
    where: {
      eventId: selectedEvent.id,
      kind: "EGRESADO",
      ...(activeView === "roster" ? { id: { in: groupRows.map((row) => row.id) } } : {}),
    },
    include: {
      school: true,
      payments: { orderBy: { paidAt: "desc" } },
      family: {
        include: { payments: { orderBy: { paidAt: "desc" } } },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }, { id: "asc" }],
  });
  if (activeView === "roster") graduates.sort((a, b) => (groupOrder.get(a.id) ?? 0) - (groupOrder.get(b.id) ?? 0));
  const allPeople = graduates.flatMap((graduate) => [graduate, ...graduate.family]);
  const [dueAggregate, paidAggregate, graduateCount, familyCount] = activeView === "roster"
    ? await Promise.all([
        prisma.graduationPerson.aggregate({ where: { eventId: selectedEvent.id }, _sum: { amountDue: true } }),
        prisma.graduationPayment.aggregate({ where: { person: { eventId: selectedEvent.id } }, _sum: { amount: true } }),
        prisma.graduationPerson.count({ where: { eventId: selectedEvent.id, kind: "EGRESADO" } }),
        prisma.graduationPerson.count({ where: { eventId: selectedEvent.id, kind: "FAMILIAR" } }),
      ])
    : [{ _sum: { amountDue: 0 } }, { _sum: { amount: 0 } }, graduates.length, allPeople.length - graduates.length];
  const totalDue = dueAggregate._sum.amountDue ?? 0;
  const totalPaid = paidAggregate._sum.amount ?? 0;
  const searchTerms = normalizeSearch(params.q ?? "").split(/\s+/).filter(Boolean);

  function matchesSearch(values: Array<string | null | undefined>) {
    const searchableText = normalizeSearch(values.filter(Boolean).join(" "));
    return searchTerms.every((term) => searchableText.includes(term));
  }

  function personMatchesFilters(person: (typeof allPeople)[number], graduate: (typeof graduates)[number]) {
    const schoolMatches = searchTerms.length > 0 && matchesSearch([graduate.school?.name]);
    const personMatches = matchesSearch([person.firstName, person.lastName, person.relationship, person.notes]);
    const matchesCategory = !params.category || person.priceCategory === params.category;
    const matchesPayment = !params.paymentStatus || paymentStatus(person.amountDue, paidTotal(person)) === params.paymentStatus;

    return (schoolMatches || personMatches) && matchesCategory && matchesPayment;
  }

  const visibleGraduates = graduates.filter((graduate) => {
    const people = [graduate, ...graduate.family];
    const matchesSchool = !params.schoolId || graduate.schoolId === params.schoolId;

    return matchesSchool && people.some((person) => personMatchesFilters(person, graduate));
  });
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <EventWorkspaceNav
        active="graduates"
        event={{
          id: selectedEvent.id,
          isGraduation: true,
          label: `${formatDate(toDateKey(selectedEvent.date))} - ${formatTurn(selectedEvent.turn)} - ${selectedEvent.client.name} - ${selectedEvent.eventType.name}`,
        }}
      />

      <header className="pageHeader">
        <div>
          <h1>Egresados</h1>
          <p>Colegios, grupos familiares y pagos individuales por fiesta.</p>
        </div>
        {selectedEvent.graduationFullPrice && activeView === "setup" ? (
          <div className="buttonRow">
            <a className="button" href="#nuevo-familiar">Agregar familiar</a>
            <a className="button primary" href="#nuevo-egresado">Agregar egresado</a>
          </div>
        ) : null}
      </header>

      {params.error && errorMessages[params.error] ? (
        <div className="warningBox" style={{ marginBottom: 16 }}>{errorMessages[params.error]}</div>
      ) : null}

      <nav aria-label="Gestión de egresados" className="pageTabs graduationSectionTabs">
        <Link aria-current={activeView === "setup" ? "page" : undefined} href={`/egresados?eventId=${selectedEvent.id}&view=setup`}>
          Carga y configuración
        </Link>
        {selectedEvent.graduationFullPrice ? (
          <Link aria-current={activeView === "roster" ? "page" : undefined} href={`/egresados?eventId=${selectedEvent.id}&view=roster`}>
            Padrón y pagos
          </Link>
        ) : null}
      </nav>

      {!selectedEvent.graduationFullPrice ? (
        <section className="panel">
          <div className="panelHeader"><h2>Configurar padrón</h2></div>
          <form action={enableGraduationEvent} className="panelBody formGrid">
            <input name="eventId" type="hidden" value={selectedEvent.id} />
            <div className="field">
              <label htmlFor="fullPrice">Precio de tarjeta completa</label>
              <input id="fullPrice" inputMode="numeric" name="fullPrice" placeholder="Ej: 100.000" required />
              <p className="fieldHelp">Los egresados y mayores de 6 años pagan este importe. La media tarjeta se calcula automáticamente.</p>
            </div>
            <div className="formActions"><button className="button primary" type="submit">Habilitar padrón</button></div>
          </form>
        </section>
      ) : (
        <>
          {activeView === "setup" ? (
            <>
          <section className="grid columns2 graduationForms">
            <section className="panel">
              <div className="panelHeader"><h2>Colegios</h2><span className="muted">{schools.length} cargados</span></div>
              <form action={createGraduationSchool} className="panelBody inlineManagementForm">
                <input name="eventId" type="hidden" value={selectedEvent.id} />
                <div className="field"><label htmlFor="schoolName">Nuevo colegio</label><input id="schoolName" name="name" placeholder="Nombre del colegio" required /></div>
                <button className="button" type="submit">Agregar</button>
              </form>
            </section>

            <section className="panel">
              <div className="panelHeader"><h2>Precio de referencia</h2></div>
              <div className="panelBody summaryLine"><span>Tarjeta completa</span><strong>{formatCurrency(selectedEvent.graduationFullPrice)}</strong></div>
            </section>
          </section>

          <section className="panel" id="nuevo-egresado" style={{ marginBottom: 16 }}>
            <div className="panelHeader"><h2>Agregar egresado</h2></div>
            <form action={createGraduationPerson} className="panelBody formGrid">
              <input name="eventId" type="hidden" value={selectedEvent.id} />
              <input name="kind" type="hidden" value="EGRESADO" />
              <div className="field"><label htmlFor="graduateLastName">Apellido</label><input id="graduateLastName" name="lastName" required /></div>
              <div className="field"><label htmlFor="graduateFirstName">Nombre</label><input id="graduateFirstName" name="firstName" required /></div>
              <div className="field">
                <label htmlFor="graduateSchool">Colegio</label>
                <select id="graduateSchool" name="schoolId" required defaultValue="">
                  <option disabled value="">Seleccionar colegio</option>
                  {schools.map((school) => <option key={school.id} value={school.id}>{school.name}</option>)}
                </select>
              </div>
              <div className="field"><label htmlFor="graduateNotes">Observación</label><input id="graduateNotes" name="notes" placeholder="Opcional" /></div>
              <div className="formActions"><button className="button primary" disabled={schools.length === 0} type="submit">Guardar egresado</button></div>
            </form>
          </section>

          <section className="panel" id="nuevo-familiar" style={{ marginBottom: 16 }}>
            <div className="panelHeader"><h2>Agregar familiar</h2></div>
            <form action={createGraduationPerson} className="panelBody formGrid">
              <input name="eventId" type="hidden" value={selectedEvent.id} />
              <input name="kind" type="hidden" value="FAMILIAR" />
              <div className="field">
                <label htmlFor="familyGraduate">Egresado asociado</label>
                <select id="familyGraduate" name="graduateId" required defaultValue="">
                  <option disabled value="">Seleccionar egresado</option>
                  {graduates.map((graduate) => <option key={graduate.id} value={graduate.id}>{graduate.lastName}, {graduate.firstName} - {graduate.school?.name}</option>)}
                </select>
              </div>
              <div className="field"><label htmlFor="relationship">Parentesco</label><input id="relationship" name="relationship" placeholder="Ej: madre, hermano" /></div>
              <div className="field"><label htmlFor="familyLastName">Apellido</label><input id="familyLastName" name="lastName" required /></div>
              <div className="field"><label htmlFor="familyFirstName">Nombre</label><input id="familyFirstName" name="firstName" required /></div>
              <div className="field"><label htmlFor="age">Edad</label><input id="age" max="120" min="0" name="age" required type="number" /></div>
              <div className="field">
                <label htmlFor="benefit">Condición especial</label>
                <select id="benefit" name="benefit">
                  <option value="NORMAL">Ninguna, calcular por edad</option>
                  <option value="DISCAPACIDAD_SIN_CARGO">Cupo discapacidad sin cargo</option>
                  <option value="DISCAPACIDAD_MITAD">Discapacidad, paga 50%</option>
                </select>
              </div>
              <div className="field fullWidth"><label htmlFor="familyNotes">Observación</label><input id="familyNotes" name="notes" placeholder="Opcional" /></div>
              <div className="formActions"><button className="button primary" disabled={graduates.length === 0} type="submit">Guardar familiar</button></div>
            </form>
          </section>
            </>
          ) : (
            <>
          <section className="grid columns3 graduationMetrics" aria-label="Resumen del padrón">
            <article className="panel panelBody metric"><span>Egresados</span><strong>{graduateCount}</strong></article>
            <article className="panel panelBody metric"><span>Familiares</span><strong>{familyCount}</strong></article>
            <article className="panel panelBody metric"><span>Saldo pendiente</span><strong>{formatCurrency(totalDue - totalPaid)}</strong></article>
          </section>

          <section className="panel">
            <div className="panelHeader"><h2>Padrón y pagos</h2><span className="muted">Ordenado por apellido del egresado</span></div>
            <form className="panelBody graduationFilters" method="get">
              <input name="eventId" type="hidden" value={selectedEvent.id} />
              <input name="view" type="hidden" value="roster" />
              <div className="field"><label htmlFor="q">Buscar persona o colegio</label><input defaultValue={params.q} id="q" name="q" placeholder="Apellido, nombre o colegio" /></div>
              <div className="field"><label htmlFor="schoolId">Colegio</label><select defaultValue={params.schoolId ?? ""} id="schoolId" name="schoolId"><option value="">Todos</option>{schools.map((school) => <option key={school.id} value={school.id}>{school.name}</option>)}</select></div>
              <div className="field"><label htmlFor="category">Tarifa</label><select defaultValue={params.category ?? ""} id="category" name="category"><option value="">Todas</option>{Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
              <div className="field"><label htmlFor="paymentStatus">Pago</label><select defaultValue={params.paymentStatus ?? ""} id="paymentStatus" name="paymentStatus"><option value="">Todos</option><option value="PENDIENTE">Pendiente</option><option value="PARCIAL">Parcial</option><option value="PAGADO">Pagado</option></select></div>
              <div className="formActions buttonRow"><button className="button primary" type="submit">Buscar</button><a className="button" href={`/egresados?eventId=${selectedEvent.id}&view=roster`}>Limpiar</a></div>
            </form>

            <div className="graduationRoster">
              {visibleGraduates.map((graduate) => {
                const people = [graduate, ...graduate.family];
                const visiblePeople = people.filter((person) => personMatchesFilters(person, graduate));

                return (
                  <section className="graduateGroup" key={graduate.id}>
                    <header>
                      <div><strong>{graduate.lastName}, {graduate.firstName}</strong><span>{graduate.school?.name}</span></div>
                      <div><span>{people.length - 1} familiares</span><strong>Saldo {formatCurrency(people.reduce((total, person) => total + person.amountDue - paidTotal(person), 0))}</strong></div>
                    </header>
                    <div className="tableWrap">
                      <table className="responsiveTable graduationTable">
                        <thead><tr><th>Persona</th><th>Detalle</th><th>Tarifa</th><th>Total</th><th>Pagado</th><th>Saldo</th><th>Pago</th></tr></thead>
                        <tbody>
                          {visiblePeople.map((person) => {
                            const paid = paidTotal(person);
                            const balance = person.amountDue - paid;
                            const status = paymentStatus(person.amountDue, paid);
                            return (
                              <tr key={person.id}>
                                <td data-label="Persona"><strong>{person.lastName}, {person.firstName}</strong><small>{person.kind === "EGRESADO" ? "Egresado" : person.relationship || "Familiar"}</small></td>
                                <td data-label="Detalle">{person.kind === "FAMILIAR" ? `${person.age} años` : "-"}{person.notes ? <small>{person.notes}</small> : null}</td>
                                <td data-label="Tarifa">{categoryLabels[person.priceCategory]}</td>
                                <td data-label="Total">{formatCurrency(person.amountDue)}</td>
                                <td data-label="Pagado">{formatCurrency(paid)}<small className={`paymentState state${status}`}>{status === "PAGADO" ? "Pagado" : status === "PARCIAL" ? "Parcial" : "Pendiente"}</small></td>
                                <td data-label="Saldo"><strong>{formatCurrency(balance)}</strong></td>
                                <td data-label="Pago">
                                  {balance > 0 ? (
                                    <details className="paymentDetails">
                                      <summary className="button">Registrar</summary>
                                      <form action={createGraduationPayment} className="paymentForm">
                                        <input name="eventId" type="hidden" value={selectedEvent.id} />
                                        <input name="personId" type="hidden" value={person.id} />
                                        <div className="field"><label>Monto</label><input inputMode="numeric" max={balance} name="amount" placeholder={String(balance)} required /></div>
                                        <div className="field"><label>Medio</label><select name="method"><option value="EFECTIVO">Efectivo</option><option value="TRANSFERENCIA">Transferencia</option></select></div>
                                        <div className="field"><label>Fecha</label><input defaultValue={today} name="paidAt" required type="date" /></div>
                                        <div className="field"><label>Observación</label><input name="note" placeholder="Opcional" /></div>
                                        <button className="button primary" type="submit">Guardar pago</button>
                                      </form>
                                    </details>
                                  ) : <span className="muted">Sin saldo</span>}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </section>
                );
              })}
              {visibleGraduates.length === 0 ? <p className="muted serviceEmptyState">No hay grupos que coincidan con los filtros.</p> : null}
            </div>
            <Pagination
              page={page}
              pageParam="page"
              pageSize={PAGE_SIZE}
              pathname="/egresados"
              searchParams={{ eventId: selectedEvent.id, view: "roster", q: params.q, schoolId: params.schoolId, category: params.category, paymentStatus: params.paymentStatus }}
              totalItems={totalGroups}
            />
          </section>
            </>
          )}
        </>
      )}
    </>
  );
}
