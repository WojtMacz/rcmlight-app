/**
 * Production database initializer.
 * Runs on every startup but only seeds if the database is empty (no companies).
 * Uses plain JavaScript — no TypeScript/ts-node required.
 */

'use strict';

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function upsertSuperAdmin(prisma) {
  const email = process.env.SUPER_ADMIN_EMAIL || 'superadmin@rcmlight.app';
  const password = process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin123!';
  const passwordHash = await bcrypt.hash(password, 12);

  const existing = await prisma.superAdmin.findFirst();
  if (existing) {
    await prisma.superAdmin.update({
      where: { id: existing.id },
      data: { email, passwordHash },
    });
    console.log(`[init] SuperAdmin updated: ${email}`);
  } else {
    await prisma.superAdmin.create({ data: { email, passwordHash } });
    console.log(`[init] SuperAdmin created: ${email}`);
  }
}

async function init() {
  const prisma = new PrismaClient();
  try {
    // Zawsze aktualizuj super admina (env vars mają pierwszeństwo)
    await upsertSuperAdmin(prisma);

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

    console.log(`[init] Seed complete. Admin: ${adminEmail}`);
  } finally {
    await prisma.$disconnect();
  }
}

init().catch((e) => {
  console.error('[init] Database initialization failed:', e);
  process.exit(1);
});
