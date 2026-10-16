"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireOrganization } from "@/lib/auth-guards";

export async function createEventType(name: string) {
  const { organizationId } = await requireOrganization();
  const trimmedName = name.trim();

  if (!trimmedName) {
    return;
  }

  await prisma.eventType.upsert({
    where: { organizationId_name: { organizationId, name: trimmedName } },
    update: { active: true },
    create: { organizationId, name: trimmedName, active: true },
  });

  revalidatePath("/tipos-evento");
  revalidatePath("/eventos");
}

export async function updateEventType(id: string, name: string) {
  const { organizationId } = await requireOrganization();
  const trimmedName = name.trim();

  if (!id || !trimmedName) {
    return;
  }

  await prisma.eventType.update({
    where: { id, organizationId },
    data: { name: trimmedName },
  });

  revalidatePath("/tipos-evento");
  revalidatePath("/eventos");
}

export async function toggleEventType(id: string) {
  const { organizationId } = await requireOrganization();
  const eventType = await prisma.eventType.findFirst({ where: { id, organizationId } });

  if (!eventType) {
    return;
  }

  await prisma.eventType.update({
    where: { id, organizationId },
    data: { active: !eventType.active },
  });

  revalidatePath("/tipos-evento");
  revalidatePath("/eventos");
}

export async function deleteEventType(id: string) {
  const { organizationId } = await requireOrganization();
  const eventType = await prisma.eventType.findFirst({ where: { id, organizationId }, select: { id: true } });
  if (!eventType) return;
  const eventsCount = await prisma.event.count({ where: { organizationId, eventTypeId: id } });

  if (eventsCount > 0) {
    await prisma.eventType.update({ where: { id, organizationId }, data: { active: false } });
  } else {
    await prisma.eventType.delete({ where: { id, organizationId } });
  }

  revalidatePath("/tipos-evento");
  revalidatePath("/eventos");
}
