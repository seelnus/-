import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const phone = process.env.SEED_ADMIN_PHONE || '13800000000';
  const password = process.env.SEED_ADMIN_PASSWORD || 'admin123456';
  const name = process.env.SEED_ADMIN_NAME || '主账号';

  const exists = await prisma.adminUser.findUnique({ where: { phone } });
  if (!exists) {
    await prisma.adminUser.create({
      data: {
        name,
        phone,
        passwordHash: await bcrypt.hash(password, 10),
        isPrimary: true,
      },
    });
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
