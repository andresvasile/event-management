import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SUPERADMIN_EMAIL;
  const password = process.env.SUPERADMIN_PASSWORD;
  const name = process.env.SUPERADMIN_NAME ?? "Superadmin";
  if (!email || !password) throw new Error("SUPERADMIN_EMAIL y SUPERADMIN_PASSWORD son obligatorios para el seed local.");

  process.env.AUTH_BOOTSTRAP = "true";
  const { auth } = await import("../lib/auth-core");
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    await auth.api.signUpEmail({ body: { email, password, name } });
    user = await prisma.user.findUniqueOrThrow({ where: { email: email.toLowerCase() } });
  }
  await prisma.user.update({ where: { id: user.id }, data: { role: "admin", emailVerified: true } });

  const organizationId = "org-demo";
  await prisma.organization.upsert({
    where: { slug: "salon-demo" },
    update: { name: "Salón Demo" },
    create: { id: organizationId, name: "Salón Demo", slug: "salon-demo", createdAt: new Date() },
  });
  await prisma.member.upsert({
    where: { id: "member-superadmin-demo" },
    update: { role: "owner" },
    create: { id: "member-superadmin-demo", organizationId, userId: user.id, role: "owner", createdAt: new Date() },
  });

  const eventTypes = [
    { name: "Cumple", supportsGraduationRoster: false },
    { name: "Casamiento", supportsGraduationRoster: false },
    { name: "Egreso", supportsGraduationRoster: true },
    { name: "Otro", supportsGraduationRoster: false },
  ];

  for (const [index, eventType] of eventTypes.entries()) {
    await prisma.eventType.upsert({
      where: { organizationId_name: { organizationId, name: eventType.name } },
      update: { active: true, supportsGraduationRoster: eventType.supportsGraduationRoster },
      create: { id: `etype-${index + 1}`, organizationId, name: eventType.name, active: true, supportsGraduationRoster: eventType.supportsGraduationRoster },
    });
  }

  await prisma.client.createMany({
    data: [
      { id: "cli-1", organizationId, name: "Camila Álvarez", phone: "5491123456789" },
      { id: "cli-2", organizationId, name: "Martín Rivas", phone: "5491165432100" },
      { id: "cli-3", organizationId, name: "Laura Gómez", phone: "5491130303030" },
      { id: "cli-4", organizationId, name: "Sofía Pereyra", phone: "5491177778888" },
    ],
    skipDuplicates: true,
  });

  await prisma.service.createMany({
    data: [
      { id: "srv-1", organizationId, name: "Alquiler del salón", basePrice: 180000, active: true, required: true },
      { id: "srv-2", organizationId, name: "Catering", basePrice: 4500, active: true, required: false },
      { id: "srv-3", organizationId, name: "DJ", basePrice: 85000, active: true, required: false },
      { id: "srv-4", organizationId, name: "Decoración", basePrice: 65000, active: true, required: false },
      { id: "srv-5", organizationId, name: "Mozos", basePrice: 25000, active: true, required: false },
    ],
    skipDuplicates: true,
  });

  await prisma.event.createMany({
    data: [
      {
        id: "evt-1",
        organizationId,
        clientId: "cli-1",
        eventTypeId: "etype-1",
        date: new Date("2026-10-17T00:00:00"),
        turn: "NOCHE",
        status: "COTIZADO",
        guests: 90,
        notes: "Pide opción con DJ y decoración.",
      },
      {
        id: "evt-2",
        organizationId,
        clientId: "cli-2",
        eventTypeId: "etype-2",
        date: new Date("2026-10-17T00:00:00"),
        turn: "NOCHE",
        status: "CONSULTA",
        guests: 70,
      },
      {
        id: "evt-3",
        organizationId,
        clientId: "cli-3",
        eventTypeId: "etype-4",
        date: new Date("2026-10-24T00:00:00"),
        turn: "TARDE",
        status: "RESERVADO",
        guests: 55,
      },
      {
        id: "evt-4",
        organizationId,
        clientId: "cli-4",
        eventTypeId: "etype-3",
        date: new Date("2026-10-31T00:00:00"),
        turn: "NOCHE",
        status: "ACEPTADO",
        guests: 120,
      },
    ],
    skipDuplicates: true,
  });

  await prisma.quote.upsert({
    where: { token: "cotizacion-camila-1017" },
    update: {},
    create: {
      id: "quo-1",
      eventId: "evt-1",
      status: "ENVIADA",
      token: "cotizacion-camila-1017",
      expiresAt: new Date("2026-10-17T00:00:00"),
      requiredDeposit: 100000,
      conditions: "La fecha se reserva solo al registrar la seña. Los precios corresponden a esta cotización.",
      items: {
        create: [
          { id: "item-1", serviceId: "srv-1", serviceName: "Alquiler del salón", quantity: 1, unitPrice: 180000, required: true },
          { id: "item-2", serviceId: "srv-2", serviceName: "Catering", quantity: 90, unitPrice: 4500 },
          { id: "item-3", serviceId: "srv-3", serviceName: "DJ", quantity: 1, unitPrice: 85000 },
        ],
      },
    },
  });

  await prisma.quote.upsert({
    where: { token: "cotizacion-sofia-1031" },
    update: {},
    create: {
      id: "quo-2",
      eventId: "evt-4",
      status: "ACEPTADA",
      token: "cotizacion-sofia-1031",
      expiresAt: new Date("2026-10-31T00:00:00"),
      requiredDeposit: 150000,
      conditions: "Pendiente de seña para bloquear el turno.",
      items: {
        create: [
          { id: "item-4", serviceId: "srv-1", serviceName: "Alquiler del salón", quantity: 1, unitPrice: 190000, required: true },
          { id: "item-5", serviceId: "srv-2", serviceName: "Catering", quantity: 120, unitPrice: 4800 },
          { id: "item-6", serviceId: "srv-4", serviceName: "Decoración", quantity: 1, unitPrice: 65000 },
        ],
      },
    },
  });

  await prisma.quote.upsert({
    where: { token: "cotizacion-laura-1024" },
    update: {},
    create: {
      id: "quo-3",
      eventId: "evt-3",
      status: "ACEPTADA",
      token: "cotizacion-laura-1024",
      expiresAt: new Date("2026-10-24T00:00:00"),
      requiredDeposit: 90000,
      conditions: "Seña registrada. Turno reservado.",
      items: {
        create: [
          { id: "item-7", serviceId: "srv-1", serviceName: "Alquiler del salón", quantity: 1, unitPrice: 170000, required: true },
          { id: "item-8", serviceId: "srv-5", serviceName: "Mozos", quantity: 2, unitPrice: 25000 },
        ],
      },
    },
  });

  await prisma.payment.createMany({
    data: [
      {
        id: "pay-1",
        eventId: "evt-3",
        quoteId: "quo-3",
        amount: 90000,
        method: "TRANSFERENCIA",
        paidAt: new Date("2026-10-04T00:00:00"),
        note: "Seña registrada.",
      },
    ],
    skipDuplicates: true,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
