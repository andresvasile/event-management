import { getEventTypes } from "@/lib/data";
import { EventTypesManager } from "./event-types-manager";

export const dynamic = "force-dynamic";

export default async function EventTypesPage() {
  const eventTypes = await getEventTypes();

  return (
    <>
      <header className="pageHeader">
        <div>
          <h1>Tipos de evento</h1>
          <p>Valores usados al cargar consultas y cotizaciones.</p>
        </div>
      </header>

      <EventTypesManager initialEventTypes={eventTypes} />
    </>
  );
}
