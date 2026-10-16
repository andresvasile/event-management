"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { acceptQuote, rejectQuote } from "@/lib/quote-workflow";

export async function acceptPublicQuote(formData: FormData) {
  const token = String(formData.get("token") ?? "");

  if (!token) {
    return;
  }

  try {
    await prisma.$transaction((tx) => acceptQuote(tx, { token }), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  } catch {
    return;
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

  try {
    await prisma.$transaction((tx) => rejectQuote(tx, token), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  } catch {
    return;
  }

  revalidatePath(`/q/${token}`);
  revalidatePath("/cotizaciones");
  revalidatePath("/");
}
