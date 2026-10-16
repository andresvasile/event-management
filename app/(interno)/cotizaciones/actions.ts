"use server";

import { randomBytes } from "crypto";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { acceptQuote, WorkflowError } from "@/lib/quote-workflow";
import { requireOrganization } from "@/lib/auth-guards";

function isValidMoney(value: number) {
  return Number.isInteger(value) && value >= 0;
}

function moneyValue(formData: FormData, name: string) {
  const rawValue = String(formData.get(name) ?? "").trim();
  const normalizedValue = rawValue.replace(/\./g, "").replace(/,/g, ".");

  return Number(normalizedValue);
}

function isValidQuantity(value: number) {
  return Number.isInteger(value) && value >= 1;
}

export async function createQuote(formData: FormData) {
  const { organizationId } = await requireOrganization();
  const eventId = String(formData.get("eventId") ?? "");
  const requiredDeposit = moneyValue(formData, "requiredDeposit");
  const requiredUnitPrice = moneyValue(formData, "requiredUnitPrice");
  const conditions = String(formData.get("conditions") ?? "").trim();
  const selectedServiceIds = formData.getAll("serviceIds").map((value) => String(value));

  if (!eventId || !isValidMoney(requiredDeposit) || requiredDeposit < 1 || !isValidMoney(requiredUnitPrice)) {
    return;
  }
  let actionError: string | undefined;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Event" WHERE "id" = ${eventId} FOR UPDATE`;
      const [event, requiredService, selectedServices] = await Promise.all([
        tx.event.findFirst({ where: { id: eventId, organizationId } }),
        tx.service.findFirst({ where: { organizationId, required: true, active: true } }),
        selectedServiceIds.length
          ? tx.service.findMany({ where: { organizationId, id: { in: selectedServiceIds }, active: true, required: false }, orderBy: { name: "asc" } })
          : [],
      ]);

      if (!event || event.status !== "CONSULTA") throw new WorkflowError("invalid-event-status");
      if (!requiredService) throw new WorkflowError("required-service-missing");
      if (selectedServices.length !== new Set(selectedServiceIds).size) throw new WorkflowError("invalid-services");

      const optionalItems = selectedServices.map((service) => {
        const quantity = Number(formData.get(`quantity:${service.id}`) ?? 0);
        const unitPrice = moneyValue(formData, `unitPrice:${service.id}`);

        if (!isValidQuantity(quantity) || !isValidMoney(unitPrice)) throw new WorkflowError("invalid-items");

        return { serviceId: service.id, serviceName: service.name, quantity, unitPrice };
      });
      const quoteTotal = optionalItems.reduce((total, item) => total + item.quantity * item.unitPrice, requiredUnitPrice);

      if (requiredDeposit > quoteTotal) throw new WorkflowError("deposit-over-total");

      await tx.quote.create({
        data: {
          eventId,
          status: "ENVIADA",
          token: randomBytes(32).toString("base64url"),
          expiresAt: event.date,
          requiredDeposit,
          conditions: conditions || "La fecha se reserva solo al registrar la seña.",
          items: {
            create: [
              { serviceId: requiredService.id, serviceName: requiredService.name, quantity: 1, unitPrice: requiredUnitPrice, required: true },
              ...optionalItems,
            ],
          },
        },
      });
      await tx.event.update({ where: { id: eventId }, data: { status: "COTIZADO" } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    actionError = error instanceof WorkflowError ? error.code : error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002" ? "quote-exists" : "save-failed";
  }

  if (actionError) redirect(`/cotizaciones?eventId=${eventId}&error=${actionError}#nueva-cotizacion`);

  revalidatePath("/cotizaciones");
  revalidatePath("/eventos");
  revalidatePath("/");
}

export async function acceptQuoteManually(formData: FormData) {
  const { organizationId } = await requireOrganization();
  const quoteId = String(formData.get("quoteId") ?? "");

  if (!quoteId) {
    return;
  }

  let token: string | undefined;

  try {
    const quote = await prisma.$transaction((tx) => acceptQuote(tx, { id: quoteId }, true, organizationId), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
    token = quote.token;
  } catch {
    return;
  }

  revalidatePath("/cotizaciones");
  if (token) revalidatePath(`/q/${token}`);
  revalidatePath("/eventos");
  revalidatePath("/");
}

export async function deleteQuote(formData: FormData) {
  const { organizationId } = await requireOrganization();
  const quoteId = String(formData.get("quoteId") ?? "");

  if (!quoteId) {
    return;
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Quote" WHERE "id" = ${quoteId} FOR UPDATE`;
      const quote = await tx.quote.findFirst({
        where: { id: quoteId, event: { organizationId } },
        include: { _count: { select: { payments: true } } },
      });

      if (!quote || quote._count.payments > 0 || !["ENVIADA", "RECHAZADA", "VENCIDA"].includes(quote.status)) {
        throw new WorkflowError("quote-cannot-be-deleted");
      }

      await tx.event.update({ where: { id: quote.eventId, status: "COTIZADO" }, data: { status: "CONSULTA" } });
      await tx.quote.delete({ where: { id: quote.id } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch {
    return;
  }

  revalidatePath("/cotizaciones");
  revalidatePath("/eventos");
  revalidatePath("/");
}
