"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function createEvent(formData: FormData) {
  const clientName = String(formData.get("clientName") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const date = String(formData.get("date") ?? "");
  const turn = String(formData.get("turn") ?? "");
  const eventTypeId = String(formData.get("eventTypeId") ?? "");
  const guests = Number(formData.get("guests") ?? 0);

  if (!clientName || !phone || !date || !turn || !eventTypeId || guests < 1) {
    return;
  }

  const existingClient = await prisma.client.findFirst({ where: { phone } });
  const client = existingClient
    ? await prisma.client.update({ where: { id: existingClient.id }, data: { name: clientName } })
    : await prisma.client.create({ data: { name: clientName, phone } });

  await prisma.event.create({
    data: {
      clientId: client.id,
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
