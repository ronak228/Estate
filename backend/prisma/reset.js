require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

async function main() {
  console.log('[RESET] Deleting all data in dependency order...');

  // ── Module 6 ────────────────────────────────────────────────────────────────
  await db.titleTransfer.deleteMany();        console.log('  ✓ titleTransfer');
  await db.transactionPayment.deleteMany();   console.log('  ✓ transactionPayment');
  await db.invoice.deleteMany();              console.log('  ✓ invoice');
  await db.transaction.deleteMany();          console.log('  ✓ transaction');

  // ── Module 5 ────────────────────────────────────────────────────────────────
  await db.financing.deleteMany();            console.log('  ✓ financing');
  await db.dueDiligence.deleteMany();         console.log('  ✓ dueDiligence');
  await db.contractDocument.deleteMany();     console.log('  ✓ contractDocument');

  // ── Module 4 ────────────────────────────────────────────────────────────────
  await db.bookingDocument.deleteMany();      console.log('  ✓ bookingDocument');
  await db.bookingPayment.deleteMany();       console.log('  ✓ bookingPayment');
  await db.booking.deleteMany();              console.log('  ✓ booking');

  // ── Module 3 ────────────────────────────────────────────────────────────────
  await db.quotationCharge.deleteMany();      console.log('  ✓ quotationCharge');
  await db.quotation.deleteMany();            console.log('  ✓ quotation');
  await db.negotiation.deleteMany();          console.log('  ✓ negotiation');

  // ── Module 2 ────────────────────────────────────────────────────────────────
  await db.siteVisit.deleteMany();            console.log('  ✓ siteVisit');
  await db.interaction.deleteMany();          console.log('  ✓ interaction');

  // ── Module 1 ────────────────────────────────────────────────────────────────
  await db.activityLog.deleteMany();          console.log('  ✓ activityLog');
  await db.followUp.deleteMany();             console.log('  ✓ followUp');
  await db.inquiry.deleteMany();              console.log('  ✓ inquiry');

  // ── Inventory ───────────────────────────────────────────────────────────────
  await db.unit.deleteMany();                 console.log('  ✓ unit');
  await db.project.deleteMany();              console.log('  ✓ project');

  // ── Core ────────────────────────────────────────────────────────────────────
  await db.broker.deleteMany();               console.log('  ✓ broker');
  await db.contact.deleteMany();              console.log('  ✓ contact');

  // Delete non-SUPER_ADMIN users (company users), then companies, then super admin
  await db.user.deleteMany({ where: { role: { not: 'SUPER_ADMIN' } } });
  console.log('  ✓ company users');
  await db.company.deleteMany();              console.log('  ✓ company');
  await db.user.deleteMany();                 console.log('  ✓ super admin');

  console.log('\n[RESET] All data deleted.\n');
}

main()
  .catch((err) => {
    console.error('[RESET] Error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
