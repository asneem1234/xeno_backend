const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create demo tenant with real Shopify credentials
  const tenant = await prisma.tenant.upsert({
    where: { shopifyDomain: 'your-store.myshopify.com' },
    update: {
      shopifyAccessToken: 'your-shopify-access-token'
    },
    create: {
      name: 'Your Store',
      shopifyDomain: 'your-store.myshopify.com',
      shopifyAccessToken: 'your-shopify-access-token',
      isActive: true
    }
  });
  console.log('✅ Created tenant:', tenant.name);

  // Create admin user
  const hashedPassword = await bcrypt.hash('password123', 12);
  const user = await prisma.user.upsert({
    where: { email: 'admin@demo.com' },
    update: {
      tenantId: tenant.id  // Update to use the new tenant
    },
    create: {
      email: 'admin@demo.com',
      password: hashedPassword,
      name: 'Admin User',
      role: 'ADMIN',
      tenantId: tenant.id
    }
  });
  console.log('✅ Created user:', user.email);

  console.log('\n🎉 Seeding completed!');
  console.log('\n📧 Demo Login Credentials:');
  console.log('   Email: admin@demo.com');
  console.log('   Password: password123');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
