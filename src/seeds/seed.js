const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create demo tenant - Update with your Shopify credentials in .env
  const shopifyDomain = process.env.SHOPIFY_STORE_DOMAIN || 'your-store.myshopify.com';
  const shopifyToken = process.env.SHOPIFY_ACCESS_TOKEN || null;
  
  const tenant = await prisma.tenant.upsert({
    where: { shopifyDomain },
    update: {
      shopifyAccessToken: shopifyToken
    },
    create: {
      name: 'Demo Store',
      shopifyDomain,
      shopifyAccessToken: shopifyToken,
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

  // Create demo customers
  const customerNames = [
    { firstName: 'Rahul', lastName: 'Sharma', email: 'rahul.sharma@email.com' },
    { firstName: 'Priya', lastName: 'Patel', email: 'priya.patel@email.com' },
    { firstName: 'Amit', lastName: 'Kumar', email: 'amit.kumar@email.com' },
    { firstName: 'Sneha', lastName: 'Gupta', email: 'sneha.gupta@email.com' },
    { firstName: 'Vikram', lastName: 'Singh', email: 'vikram.singh@email.com' },
    { firstName: 'Ananya', lastName: 'Reddy', email: 'ananya.reddy@email.com' },
    { firstName: 'Arjun', lastName: 'Nair', email: 'arjun.nair@email.com' },
    { firstName: 'Kavya', lastName: 'Menon', email: 'kavya.menon@email.com' },
    { firstName: 'Rohan', lastName: 'Joshi', email: 'rohan.joshi@email.com' },
    { firstName: 'Meera', lastName: 'Iyer', email: 'meera.iyer@email.com' }
  ];

  const customers = [];
  for (let i = 0; i < customerNames.length; i++) {
    const c = customerNames[i];
    const totalSpent = Math.floor(Math.random() * 50000) + 5000;
    const ordersCount = Math.floor(Math.random() * 10) + 1;

    const customer = await prisma.customer.upsert({
      where: {
        tenantId_shopifyId: {
          tenantId: tenant.id,
          shopifyId: `DEMO_${i + 1}`
        }
      },
      update: {},
      create: {
        tenantId: tenant.id,
        shopifyId: `DEMO_${i + 1}`,
        email: c.email,
        firstName: c.firstName,
        lastName: c.lastName,
        phone: `+91 98${Math.floor(10000000 + Math.random() * 90000000)}`,
        ordersCount,
        totalSpent,
        currency: 'INR',
        acceptsMarketing: Math.random() > 0.5,
        shopifyCreatedAt: new Date(Date.now() - Math.floor(Math.random() * 90) * 24 * 60 * 60 * 1000)
      }
    });
    customers.push(customer);
  }
  console.log(`✅ Created ${customers.length} customers`);

  // Create demo products
  const productData = [
    { title: 'Premium Cotton T-Shirt', type: 'Apparel', price: 999, vendor: 'FashionHub' },
    { title: 'Slim Fit Jeans', type: 'Apparel', price: 1999, vendor: 'DenimCo' },
    { title: 'Running Shoes', type: 'Footwear', price: 3499, vendor: 'SportZone' },
    { title: 'Wireless Earbuds', type: 'Electronics', price: 2499, vendor: 'TechGear' },
    { title: 'Smart Watch', type: 'Electronics', price: 5999, vendor: 'TechGear' },
    { title: 'Leather Wallet', type: 'Accessories', price: 799, vendor: 'LeatherCraft' },
    { title: 'Sunglasses', type: 'Accessories', price: 1299, vendor: 'EyeStyle' },
    { title: 'Backpack', type: 'Bags', price: 1599, vendor: 'TravelPro' },
    { title: 'Formal Shirt', type: 'Apparel', price: 1499, vendor: 'FashionHub' },
    { title: 'Sneakers', type: 'Footwear', price: 2999, vendor: 'SportZone' }
  ];

  const products = [];
  for (let i = 0; i < productData.length; i++) {
    const p = productData[i];
    const product = await prisma.product.upsert({
      where: {
        tenantId_shopifyId: {
          tenantId: tenant.id,
          shopifyId: `PROD_${i + 1}`
        }
      },
      update: {},
      create: {
        tenantId: tenant.id,
        shopifyId: `PROD_${i + 1}`,
        title: p.title,
        handle: p.title.toLowerCase().replace(/\s+/g, '-'),
        productType: p.type,
        vendor: p.vendor,
        status: 'active',
        price: p.price,
        inventoryQuantity: Math.floor(Math.random() * 100) + 10,
        shopifyCreatedAt: new Date(Date.now() - Math.floor(Math.random() * 180) * 24 * 60 * 60 * 1000)
      }
    });
    products.push(product);
  }
  console.log(`✅ Created ${products.length} products`);

  // Create demo orders
  const statuses = ['paid', 'paid', 'paid', 'pending', 'refunded'];
  const fulfillmentStatuses = ['fulfilled', 'fulfilled', 'unfulfilled', 'partial'];

  for (let i = 0; i < 50; i++) {
    const customer = customers[Math.floor(Math.random() * customers.length)];
    const numItems = Math.floor(Math.random() * 3) + 1;
    const selectedProducts = [];
    let subtotal = 0;

    for (let j = 0; j < numItems; j++) {
      const product = products[Math.floor(Math.random() * products.length)];
      const quantity = Math.floor(Math.random() * 2) + 1;
      selectedProducts.push({ product, quantity });
      subtotal += parseFloat(product.price) * quantity;
    }

    const tax = subtotal * 0.18;
    const discount = Math.random() > 0.7 ? subtotal * 0.1 : 0;
    const total = subtotal + tax - discount;

    const orderDate = new Date(Date.now() - Math.floor(Math.random() * 90) * 24 * 60 * 60 * 1000);

    const order = await prisma.order.create({
      data: {
        tenantId: tenant.id,
        shopifyId: `ORDER_${i + 1}`,
        orderNumber: `#${1000 + i}`,
        email: customer.email,
        financialStatus: statuses[Math.floor(Math.random() * statuses.length)],
        fulfillmentStatus: fulfillmentStatuses[Math.floor(Math.random() * fulfillmentStatuses.length)],
        totalPrice: total,
        subtotalPrice: subtotal,
        totalTax: tax,
        totalDiscount: discount,
        currency: 'INR',
        itemCount: numItems,
        customerId: customer.id,
        shopifyCreatedAt: orderDate,
        shopifyUpdatedAt: orderDate
      }
    });

    // Create line items
    for (const item of selectedProducts) {
      await prisma.lineItem.create({
        data: {
          orderId: order.id,
          shopifyId: `LI_${order.id}_${item.product.shopifyId}`,
          title: item.product.title,
          quantity: item.quantity,
          price: item.product.price,
          productId: item.product.shopifyId
        }
      });
    }
  }
  console.log('✅ Created 50 orders with line items');

  // Create some demo events
  const eventTypes = ['CART_ABANDONED', 'CHECKOUT_STARTED', 'PAGE_VIEW', 'PRODUCT_VIEW', 'ADD_TO_CART'];

  for (let i = 0; i < 30; i++) {
    const customer = customers[Math.floor(Math.random() * customers.length)];
    await prisma.event.create({
      data: {
        tenantId: tenant.id,
        eventType: eventTypes[Math.floor(Math.random() * eventTypes.length)],
        customerId: Math.random() > 0.3 ? customer.id : null,
        sessionId: `SESSION_${Math.random().toString(36).substr(2, 9)}`,
        eventData: JSON.stringify({
          page: '/products',
          source: 'web'
        }),
        createdAt: new Date(Date.now() - Math.floor(Math.random() * 7) * 24 * 60 * 60 * 1000)
      }
    });
  }
  console.log('✅ Created 30 events');

  // Create sync log
  await prisma.syncLog.create({
    data: {
      tenantId: tenant.id,
      syncType: 'FULL',
      status: 'COMPLETED',
      recordsCount: customers.length + products.length + 50,
      completedAt: new Date()
    }
  });
  console.log('✅ Created sync log');

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
