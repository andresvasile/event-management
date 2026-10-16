"use client";

import Link from "next/link";

export type EventWorkspaceOption = {
  id: string;
  label: string;
  isGraduation: boolean;
};

type EventWorkspaceNavProps = {
  active: "summary" | "quote" | "payments" | "graduates";
  event: EventWorkspaceOption;
};

export function EventWorkspaceNav({ active, event }: EventWorkspaceNavProps) {
  return (
    <section className="eventWorkspace">
      <div className="eventWorkspaceHeading">
        <div><span>Evento</span><strong>{event.label}</strong></div>
        <Link className="button" href="/eventos?view=list">Cambiar evento</Link>
      </div>
      <nav aria-label="Información del evento" className="pageTabs eventWorkspaceTabs">
        <Link aria-current={active === "summary" ? "page" : undefined} href={`/eventos/${event.id}`}>Resumen</Link>
        <Link aria-current={active === "quote" ? "page" : undefined} href={`/cotizaciones?eventId=${event.id}`}>Cotización</Link>
        <Link aria-current={active === "payments" ? "page" : undefined} href={`/pagos?eventId=${event.id}`}>Pagos</Link>
        {event.isGraduation ? (
          <Link aria-current={active === "graduates" ? "page" : undefined} href={`/egresados?eventId=${event.id}`}>Egresados</Link>
        ) : null}
      </nav>
    </section>
  );
}
