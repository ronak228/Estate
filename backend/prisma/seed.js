require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const bcrypt = require('bcryptjs');

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

async function main() {
  console.log('[SEED] Starting database seed...');

  // ─── SUPER_ADMIN ────────────────────────────────────────────────────────────
  const superAdminHash = await bcrypt.hash('Admin@123', 10);
  const superAdmin = await db.user.upsert({
    where: { email: 'superadmin@estate.com' },
    update: {},
    create: {
      fullName: 'Super Admin',
      email: 'superadmin@estate.com',
      passwordHash: superAdminHash,
      role: 'SUPER_ADMIN',
      isActive: true,
    },
  });
  console.log('[SEED] Super Admin created:', superAdmin.email);

  console.log('');
  console.log('[SEED] Seed completed successfully.');
  console.log('');
  console.log('Login Credentials:');
  console.log('  SUPER_ADMIN: superadmin@estate.com / Admin@123');
}

main()
  .catch((err) => {
    console.error('[SEED] Error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
