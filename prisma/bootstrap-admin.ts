import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SUPERADMIN_EMAIL?.toLowerCase();
  const password = process.env.SUPERADMIN_PASSWORD;
  const name = process.env.SUPERADMIN_NAME ?? "Superadmin";

  if (!email || !password) {
    throw new Error("SUPERADMIN_EMAIL y SUPERADMIN_PASSWORD son obligatorios.");
  }

  process.env.AUTH_BOOTSTRAP = "true";
  const { auth } = await import("../lib/auth-core");
  const existing = await prisma.user.findUnique({ where: { email } });

  if (!existing) {
    await auth.api.signUpEmail({ body: { email, password, name } });
  }

  const user = await prisma.user.update({
    where: { email },
    data: { role: "admin", emailVerified: true },
  });
  console.log(`Superadmin listo: ${user.email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
