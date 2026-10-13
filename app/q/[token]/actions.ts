"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function acceptPublicQuote(formData: FormData) {
  const token = String(formData.get("token") ?? "");

  if (!token) {
    return;
  }

  const quote = await prisma.quote.findUnique({
    where: { token },
    include: { event: true },
  });

  if (!quote || quote.status === "CANCELADA" || quote.status === "VENCIDA") {
    return;
  }

  await prisma.quote.update({ where: { id: quote.id }, data: { status: "ACEPTADA" } });

  if (quote.event.status !== "RESERVADO" && quote.event.status !== "CONFIRMADO") {
    await prisma.event.update({ where: { id: quote.eventId }, data: { status: "ACEPTADO" } });
  }

  revalidatePath(`/q/${token}`);
  revalidatePath("/cotizaciones");
  revalidatePath("/eventos");
  revalidatePath("/");
}

export async function rejectPublicQuote(formData: FormData) {
  const token = String(formData.get("token") ?? "");

  if (!token) {
    return;
  }

  const quote = await prisma.quote.findUnique({ where: { token } });

  if (!quote || quote.status === "CANCELADA" || quote.status === "VENCIDA") {
    return;
  }

  await prisma.quote.update({ where: { id: quote.id }, data: { status: "RECHAZADA" } });

  revalidatePath(`/q/${token}`);
  revalidatePath("/cotizaciones");
  revalidatePath("/");
}
