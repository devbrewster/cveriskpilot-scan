import { PrismaClient } from '@prisma/client';
import { seedDevData } from '@cveriskpilot/storage/seed/seed';

const prisma = new PrismaClient();

async function main() {
  await seedDevData(prisma);
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
