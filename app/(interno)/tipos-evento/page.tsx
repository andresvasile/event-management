import { prisma } from "@/lib/prisma";
import { PAGE_SIZE, parsePage } from "@/lib/pagination";
import { EventTypesManager } from "./event-types-manager";
import { Pagination } from "../pagination";
import { requireOrganization } from "@/lib/auth-guards";

export const dynamic = "force-dynamic";

type EventTypesPageProps = { searchParams: Promise<{ page?: string }> };

export default async function EventTypesPage({ searchParams }: EventTypesPageProps) {
  const requestedPage = parsePage((await searchParams).page);
  const { organizationId } = await requireOrganization();
  const totalItems = await prisma.eventType.count({ where: { organizationId } });
  const page = Math.min(requestedPage, Math.max(1, Math.ceil(totalItems / PAGE_SIZE)));
  const eventTypes = await prisma.eventType.findMany({
    where: { organizationId },
    orderBy: [{ name: "asc" }, { id: "asc" }],
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  return (
    <>
      <header className="pageHeader">
        <div>
          <h1>Tipos de evento</h1>
          <p>Valores usados al cargar consultas y cotizaciones.</p>
        </div>
      </header>

      <EventTypesManager initialEventTypes={eventTypes} />
      <Pagination page={page} pageParam="page" pageSize={PAGE_SIZE} pathname="/tipos-evento" totalItems={totalItems} />
    </>
  );
}
