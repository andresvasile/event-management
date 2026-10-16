"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireOrganization } from "@/lib/auth-guards";
import { todayDateKey } from "@/lib/domain";

export async function createEvent(formData: FormData) {
  const { organizationId } = await requireOrganization();
  const clientName = String(formData.get("clientName") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const date = String(formData.get("date") ?? "");
  const turn = String(formData.get("turn") ?? "");
  const eventTypeId = String(formData.get("eventTypeId") ?? "");
  const guests = Number(formData.get("guests") ?? 0);

  if (!clientName || !phone || !date || date < todayDateKey() || !turn || !eventTypeId || guests < 1) {
    return;
  }

  const eventType = await prisma.eventType.findFirst({ where: { id: eventTypeId, organizationId, active: true }, select: { id: true } });
  if (!eventType) return;

  const existingClient = await prisma.client.findFirst({ where: { organizationId, phone } });
  const client = existingClient
    ? await prisma.client.update({ where: { id: existingClient.id }, data: { name: clientName } })
    : await prisma.client.create({ data: { organizationId, name: clientName, phone } });

  await prisma.event.create({
    data: {
      clientId: client.id,
      organizationId,
      eventTypeId,
      date: new Date(`${date}T00:00:00`),
      turn: turn === "MANANA" || turn === "TARDE" || turn === "NOCHE" ? turn : "NOCHE",
      status: "CONSULTA",
      guests,
    },
  });

  revalidatePath("/eventos");
  revalidatePath("/");
}
