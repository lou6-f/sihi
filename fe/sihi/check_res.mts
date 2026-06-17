import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();

const count = await p.resource.count({ where: { status: "PUBLISHED" } });
console.log("Total PUBLISHED:", count);

const rs = await p.resource.findMany({
  where: { status: "PUBLISHED" },
  select: { title: true, field: true },
  orderBy: { createdAt: "desc" },
  take: 50,
});

rs.forEach((r) => console.log(r.field, "|", r.title));
await p.$disconnect();
