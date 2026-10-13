"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function createService(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const basePriceValue = String(formData.get("basePrice") ?? "").trim();
  const basePrice = basePriceValue ? Number(basePriceValue) : null;

  if (!name || (basePrice !== null && basePrice < 0)) {
    return;
  }

  await prisma.service.upsert({
    where: { name },
    update: { basePrice, active: true },
    create: { name, basePrice, active: true, required: false },
  });

  revalidatePath("/servicios");
  revalidatePath("/cotizaciones");
}
