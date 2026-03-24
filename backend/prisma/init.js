/**
 * Production database initializer.
 * Runs on every startup but only seeds if the database is empty (no companies).
 * Uses plain JavaScript — no TypeScript/ts-node required.
 */

'use strict';

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function init() {
  const prisma = new PrismaClient();
  try {
    const count = await prisma.company.count();
    if (count > 0) {
      console.log('[init] Database already initialized — skipping seed.');
      return;
    }

    console.log('[init] Empty database detected — seeding initial data...');

    const company = await prisma.company.create({
      data: {
        name: 'RCMLight',
        slug: 'rcmlight',
        isActive: true,
      },
    });

    const adminEmail = 'wojtek.maczynski@womasolution24.com';
    const adminPassword = '#Admin13579!';
    const passwordHash = await bcrypt.hash(adminPassword, 12);

    await prisma.user.create({
      data: {
        email: adminEmail,
        firstName: 'Wojciech',
        lastName: 'Maczyński',
        role: 'ADMIN',
        passwordHash,
        companyId: company.id,
        isActive: true,
      },
    });

    await prisma.superAdmin.upsert({
      where: { email: 'superadmin@rcmlight.app' },
      update: {},
      create: {
        email: 'superadmin@rcmlight.app',
        passwordHash: await bcrypt.hash('SuperAdmin123!', 12),
      },
    });

    console.log(`[init] Seed complete. Admin: ${adminEmail}`);
  } finally {
    await prisma.$disconnect();
  }
}

init().catch((e) => {
  console.error('[init] Database initialization failed:', e);
  process.exit(1);
});
