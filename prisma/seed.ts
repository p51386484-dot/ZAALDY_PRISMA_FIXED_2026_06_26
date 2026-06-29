import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password";

const prisma = new PrismaClient();

async function main() {
  const adminPasswordHash = hashPassword("Admin@1234");

  await prisma.user.upsert({
    where: { phone: "admin" },
    update: {
      name: "Zaaldy Admin",
      passwordHash: adminPasswordHash,
      role: "ADMIN"
    },
    create: {
      name: "Zaaldy Admin",
      phone: "admin",
      passwordHash: adminPasswordHash,
      role: "ADMIN"
    }
  });

  const courts = [
    {
      name: "Zaaldy Arena",
      location: "СБД, 1-р хороо",
      pricePerHour: 70000,
      description: "Сагс, волейбол тоглоход тохиромжтой, гэрэлтүүлэг сайтай том заал.",
      imageUrl: "https://images.unsplash.com/photo-1546519638-68e109498ffc?q=80&w=1200&auto=format&fit=crop"
    },
    {
      name: "Champion Futsal",
      location: "БГД, 3-р хороолол",
      pricePerHour: 60000,
      description: "Мини хөлбөмбөг, фитнес бэлтгэлд тохиромжтой шалтай заал.",
      imageUrl: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=1200&auto=format&fit=crop"
    },
    {
      name: "Hoop Center",
      location: "ХУД, Зайсан",
      pricePerHour: 85000,
      description: "Шинэ паркетан шалтай, хувцас солих өрөөтэй premium заал.",
      imageUrl: "https://images.unsplash.com/photo-1504450758481-7338eba7524a?q=80&w=1200&auto=format&fit=crop"
    }
  ];

  for (const court of courts) {
    const existing = await prisma.court.findFirst({ where: { name: court.name } });
    if (existing) {
      await prisma.court.update({ where: { id: existing.id }, data: court });
    } else {
      await prisma.court.create({ data: court });
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
