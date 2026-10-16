"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireOrganization } from "@/lib/auth-guards";

function graduationEventWhere(organizationId: string) {
  return {
  organizationId,
  eventType: {
    is: { supportsGraduationRoster: true },
  },
  } as const;
}

function moneyValue(formData: FormData, name: string) {
  const rawValue = String(formData.get(name) ?? "").trim();
  return Number(rawValue.replace(/\./g, "").replace(/,/g, "."));
}

function graduationPath(eventId: string, error?: string, view?: "setup" | "roster") {
  const params = new URLSearchParams({ eventId });

  if (view) {
    params.set("view", view);
  }

  if (error) {
    params.set("error", error);
  }

  return `/egresados?${params.toString()}`;
}

export async function enableGraduationEvent(formData: FormData) {
  const { organizationId } = await requireOrganization();
  const eventId = String(formData.get("eventId") ?? "");
  const fullPrice = moneyValue(formData, "fullPrice");

  if (!eventId || !Number.isInteger(fullPrice) || fullPrice < 1) {
    redirect(graduationPath(eventId, "invalid-price"));
  }

  const event = await prisma.event.findFirst({ where: { id: eventId, ...graduationEventWhere(organizationId) }, select: { id: true } });

  if (!event) {
    redirect("/egresados?error=event-not-found");
  }

  await prisma.event.update({ where: { id: eventId }, data: { graduationFullPrice: fullPrice } });
  revalidatePath("/egresados");
  redirect(graduationPath(eventId));
}

export async function createGraduationSchool(formData: FormData) {
  const { organizationId } = await requireOrganization();
  const eventId = String(formData.get("eventId") ?? "");
  const name = String(formData.get("name") ?? "").trim();

  if (!eventId || !name) {
    redirect(graduationPath(eventId, "invalid-school"));
  }

  const event = await prisma.event.findFirst({
    where: { id: eventId, ...graduationEventWhere(organizationId) },
    select: { graduationFullPrice: true },
  });

  if (!event?.graduationFullPrice) {
    redirect(graduationPath(eventId, "event-not-enabled"));
  }

  const existingSchool = await prisma.graduationSchool.findFirst({
    where: { eventId, name: { equals: name, mode: "insensitive" } },
  });

  if (existingSchool) {
    redirect(graduationPath(eventId, "school-exists"));
  }

  await prisma.graduationSchool.create({ data: { eventId, name } });
  revalidatePath("/egresados");
  redirect(graduationPath(eventId));
}

export async function createGraduationPerson(formData: FormData) {
  const { organizationId } = await requireOrganization();
  const eventId = String(formData.get("eventId") ?? "");
  const kind = String(formData.get("kind") ?? "");
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const schoolId = String(formData.get("schoolId") ?? "");
  const graduateId = String(formData.get("graduateId") ?? "");
  const relationship = String(formData.get("relationship") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const benefit = String(formData.get("benefit") ?? "NORMAL");
  const ageValue = String(formData.get("age") ?? "").trim();
  const age = ageValue === "" ? null : Number(ageValue);

  if (!eventId || !firstName || !lastName || (kind !== "EGRESADO" && kind !== "FAMILIAR")) {
    redirect(graduationPath(eventId, "invalid-person"));
  }

  const event = await prisma.event.findFirst({
    where: { id: eventId, ...graduationEventWhere(organizationId) },
    select: { graduationFullPrice: true },
  });

  if (!event?.graduationFullPrice) {
    redirect(graduationPath(eventId, "event-not-enabled"));
  }

  if (kind === "EGRESADO") {
    const school = await prisma.graduationSchool.findFirst({ where: { id: schoolId, eventId } });

    if (!school) {
      redirect(graduationPath(eventId, "invalid-school"));
    }

    await prisma.graduationPerson.create({
      data: {
        eventId,
        schoolId,
        kind,
        firstName,
        lastName,
        priceCategory: "COMPLETA",
        amountDue: event.graduationFullPrice,
        notes: notes || undefined,
      },
    });
  } else {
    if (age === null || !Number.isInteger(age) || age < 0 || age > 120) {
      redirect(graduationPath(eventId, "invalid-age"));
    }

    const graduate = await prisma.graduationPerson.findFirst({ where: { id: graduateId, eventId, kind: "EGRESADO" } });

    if (!graduate) {
      redirect(graduationPath(eventId, "invalid-graduate"));
    }

    let priceCategory: "COMPLETA" | "MENOR_SIN_CARGO" | "MENOR_MITAD" | "DISCAPACIDAD_SIN_CARGO" | "DISCAPACIDAD_MITAD";
    let amountDue: number;

    if (benefit === "DISCAPACIDAD_SIN_CARGO") {
      priceCategory = "DISCAPACIDAD_SIN_CARGO";
      amountDue = 0;
    } else if (benefit === "DISCAPACIDAD_MITAD") {
      priceCategory = "DISCAPACIDAD_MITAD";
      amountDue = Math.round(event.graduationFullPrice / 2);
    } else if (age <= 2) {
      priceCategory = "MENOR_SIN_CARGO";
      amountDue = 0;
    } else if (age <= 5) {
      priceCategory = "MENOR_MITAD";
      amountDue = Math.round(event.graduationFullPrice / 2);
    } else {
      priceCategory = "COMPLETA";
      amountDue = event.graduationFullPrice;
    }

    await prisma.graduationPerson.create({
      data: {
        eventId,
        graduateId,
        kind,
        firstName,
        lastName,
        relationship: relationship || undefined,
        age,
        priceCategory,
        amountDue,
        notes: notes || undefined,
      },
    });
  }

  revalidatePath("/egresados");
  redirect(graduationPath(eventId));
}

export async function createGraduationPayment(formData: FormData) {
  const { organizationId } = await requireOrganization();
  const eventId = String(formData.get("eventId") ?? "");
  const personId = String(formData.get("personId") ?? "");
  const amount = moneyValue(formData, "amount");
  const method = String(formData.get("method") ?? "");
  const paidAt = String(formData.get("paidAt") ?? "");
  const note = String(formData.get("note") ?? "").trim();

  if (
    !eventId ||
    !personId ||
    !Number.isInteger(amount) ||
    amount < 1 ||
    !paidAt ||
    (method !== "EFECTIVO" && method !== "TRANSFERENCIA")
  ) {
    redirect(graduationPath(eventId, "invalid-payment", "roster"));
  }

  let actionError: string | undefined;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "GraduationPerson" WHERE "id" = ${personId} FOR UPDATE`;
        const person = await tx.graduationPerson.findFirst({ where: { id: personId, eventId, event: { organizationId } } });
        if (!person) throw new Error("invalid-person");

        const paid = (await tx.graduationPayment.aggregate({ where: { personId }, _sum: { amount: true } }))._sum.amount ?? 0;
        if (amount > person.amountDue - paid) throw new Error("payment-over-balance");

        await tx.graduationPayment.create({
          data: { personId, amount, method, paidAt: new Date(`${paidAt}T00:00:00`), note: note || undefined },
        });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      break;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034" && attempt < 2) continue;
      actionError = error instanceof Error && ["invalid-person", "payment-over-balance"].includes(error.message) ? error.message : "invalid-payment";
      break;
    }
  }

  if (actionError) redirect(graduationPath(eventId, actionError, "roster"));

  revalidatePath("/egresados");
  redirect(graduationPath(eventId, undefined, "roster"));
}
