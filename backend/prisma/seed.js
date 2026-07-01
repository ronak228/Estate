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
    where: { email: 'admin@system.local' },
    update: {},
    create: {
      fullName: 'Super Admin',
      email: 'admin@system.local',
      passwordHash: superAdminHash,
      role: 'SUPER_ADMIN',
      isActive: true,
    },
  });
  console.log('[SEED] Super Admin created:', superAdmin.email);

  // ─── Demo Estate Company ────────────────────────────────────────────────────
  const company = await db.company.upsert({
    where: { slug: 'demo-estate' },
    update: {},
    create: {
      name: 'Demo Estate',
      slug: 'demo-estate',
      status: 'ACTIVE',
      timezone: 'Asia/Kolkata',
      currency: 'INR',
      email: 'info@demoestate.local',
      phone: '+91 98765 43210',
    },
  });
  console.log('[SEED] Company created:', company.name);

  // ─── Company ADMIN ──────────────────────────────────────────────────────────
  const adminHash = await bcrypt.hash('Admin@123', 10);
  const admin = await db.user.upsert({
    where: { email: 'admin@demoestate.local' },
    update: {},
    create: {
      companyId: company.id,
      fullName: 'Demo Admin',
      email: 'admin@demoestate.local',
      passwordHash: adminHash,
      role: 'ADMIN',
      isActive: true,
    },
  });
  console.log('[SEED] Admin created:', admin.email);

  // ─── Manager ────────────────────────────────────────────────────────────────
  const managerHash = await bcrypt.hash('Manager@123', 10);
  const manager = await db.user.upsert({
    where: { email: 'manager@demoestate.local' },
    update: {},
    create: {
      companyId: company.id,
      fullName: 'Demo Manager',
      email: 'manager@demoestate.local',
      passwordHash: managerHash,
      role: 'MANAGER',
      isActive: true,
    },
  });
  console.log('[SEED] Manager created:', manager.email);

  // ─── Sales Executive ────────────────────────────────────────────────────────
  const salesHash = await bcrypt.hash('Sales@123', 10);
  const sales = await db.user.upsert({
    where: { email: 'sales@demoestate.local' },
    update: {},
    create: {
      companyId: company.id,
      fullName: 'Demo Sales',
      email: 'sales@demoestate.local',
      passwordHash: salesHash,
      role: 'SALES_EXECUTIVE',
      isActive: true,
    },
  });
  console.log('[SEED] Sales Executive created:', sales.email);

  console.log('');
  console.log('[SEED] Seed completed successfully.');
  console.log('');
  console.log('Login Credentials:');
  console.log('  SUPER_ADMIN:     admin@system.local       / Admin@123');
  console.log('  ADMIN:           admin@demoestate.local   / Admin@123');
  console.log('  MANAGER:         manager@demoestate.local / Manager@123');
  console.log('  SALES_EXECUTIVE: sales@demoestate.local   / Sales@123');
}

main()
  .catch((err) => {
    console.error('[SEED] Error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
