import { randomUUID } from "crypto";
import { PrismaClient } from "@prisma/client";
import { afterAll, describe, expect, it } from "vitest";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const integration = testDatabaseUrl ? describe : describe.skip;
const prisma = testDatabaseUrl ? new PrismaClient({ datasourceUrl: testDatabaseUrl }) : null;

function randomDate() {
  const offset = Number.parseInt(randomUUID().slice(0, 8), 16) % 50000;
  return new Date(Date.UTC(2040, 0, 1 + offset));
}

afterAll(async () => {
  await prisma?.$disconnect();
});

integration("database integrity", () => {
  it("allows inquiries but only one blocking event per date and turn", async () => {
    const suffix = randomUUID();
    const organization = await prisma!.organization.create({
      data: { id: `org-${suffix}`, name: "Test", slug: `test-${suffix}`, createdAt: new Date() },
    });
    const client = await prisma!.client.create({ data: { organizationId: organization.id, name: "Test", phone: suffix } });
    const date = randomDate();

    await prisma!.event.createMany({
      data: [
        { organizationId: organization.id, clientId: client.id, date, turn: "NOCHE", status: "CONSULTA", guests: 10 },
        { organizationId: organization.id, clientId: client.id, date, turn: "NOCHE", status: "CONSULTA", guests: 20 },
      ],
    });
    await prisma!.event.create({ data: { organizationId: organization.id, clientId: client.id, date, turn: "NOCHE", status: "RESERVADO", guests: 30 } });

    await expect(
      prisma!.event.create({ data: { organizationId: organization.id, clientId: client.id, date, turn: "NOCHE", status: "CONFIRMADO", guests: 40 } }),
    ).rejects.toBeDefined();
  });

  it("allows different organizations to reserve the same date and turn", async () => {
    const suffix = randomUUID();
    const organizations = await Promise.all([
      prisma!.organization.create({ data: { id: `org-a-${suffix}`, name: "Test A", slug: `test-a-${suffix}`, createdAt: new Date() } }),
      prisma!.organization.create({ data: { id: `org-b-${suffix}`, name: "Test B", slug: `test-b-${suffix}`, createdAt: new Date() } }),
    ]);
    const clients = await Promise.all(
      organizations.map((organization, index) =>
        prisma!.client.create({ data: { organizationId: organization.id, name: `Test ${index}`, phone: `${suffix}-${index}` } }),
      ),
    );
    const date = randomDate();

    await Promise.all(
      organizations.map((organization, index) =>
        prisma!.event.create({
          data: { organizationId: organization.id, clientId: clients[index].id, date, turn: "NOCHE", status: "RESERVADO", guests: 30 },
        }),
      ),
    );
  });

  it("enforces one quote per event", async () => {
    const suffix = randomUUID();
    const organization = await prisma!.organization.create({
      data: { id: `org-${suffix}`, name: "Test", slug: `test-${suffix}`, createdAt: new Date() },
    });
    const client = await prisma!.client.create({ data: { organizationId: organization.id, name: "Test", phone: suffix } });
    const event = await prisma!.event.create({
      data: { organizationId: organization.id, clientId: client.id, date: randomDate(), turn: "TARDE", guests: 10 },
    });
    const quote = {
      eventId: event.id,
      expiresAt: event.date,
      requiredDeposit: 100,
      conditions: "Test",
    };

    await prisma!.quote.create({ data: { ...quote, token: randomUUID() } });
    await expect(prisma!.quote.create({ data: { ...quote, token: randomUUID() } })).rejects.toBeDefined();
  });

  it("rejects payments whose quote belongs to another event", async () => {
    const suffix = randomUUID();
    const organization = await prisma!.organization.create({
      data: { id: `org-${suffix}`, name: "Test", slug: `test-${suffix}`, createdAt: new Date() },
    });
    const client = await prisma!.client.create({ data: { organizationId: organization.id, name: "Test", phone: suffix } });
    const [firstEvent, secondEvent] = await Promise.all([
      prisma!.event.create({ data: { organizationId: organization.id, clientId: client.id, date: randomDate(), turn: "MANANA", guests: 10 } }),
      prisma!.event.create({ data: { organizationId: organization.id, clientId: client.id, date: randomDate(), turn: "MANANA", guests: 10 } }),
    ]);
    const quote = await prisma!.quote.create({
      data: { eventId: firstEvent.id, token: randomUUID(), expiresAt: firstEvent.date, requiredDeposit: 100, conditions: "Test" },
    });

    await expect(
      prisma!.payment.create({
        data: { eventId: secondEvent.id, quoteId: quote.id, amount: 50, method: "EFECTIVO", paidAt: new Date("2035-03-01T00:00:00.000Z") },
      }),
    ).rejects.toBeDefined();
  });
});
