"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function createEventType(name: string) {
  const trimmedName = name.trim();

  if (!trimmedName) {
    return;
  }

  await prisma.eventType.upsert({
    where: { name: trimmedName },
    update: { active: true },
    create: { name: trimmedName, active: true },
  });

  revalidatePath("/tipos-evento");
  revalidatePath("/eventos");
}

export async function updateEventType(id: string, name: string) {
  const trimmedName = name.trim();

  if (!id || !trimmedName) {
    return;
  }

  await prisma.eventType.update({
    where: { id },
    data: { name: trimmedName },
  });

  revalidatePath("/tipos-evento");
  revalidatePath("/eventos");
}

export async function toggleEventType(id: string) {
  const eventType = await prisma.eventType.findUnique({ where: { id } });

  if (!eventType) {
    return;
  }

  await prisma.eventType.update({
    where: { id },
    data: { active: !eventType.active },
  });

  revalidatePath("/tipos-evento");
  revalidatePath("/eventos");
}

export async function deleteEventType(id: string) {
  const eventsCount = await prisma.event.count({ where: { eventTypeId: id } });

  if (eventsCount > 0) {
    await prisma.eventType.update({ where: { id }, data: { active: false } });
  } else {
    await prisma.eventType.delete({ where: { id } });
  }

  revalidatePath("/tipos-evento");
  revalidatePath("/eventos");
}
