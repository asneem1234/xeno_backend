const crypto = require('crypto');
const prisma = require('../config/database');
const config = require('../config/constants');

/**
 * Verify Shopify webhook signature
 */
const verifyWebhook = (req) => {
  const hmac = req.headers['x-shopify-hmac-sha256'];
  const body = JSON.stringify(req.body);
  const hash = crypto
    .createHmac('sha256', config.shopify.webhookSecret)
    .update(body, 'utf8')
    .digest('base64');
  return hmac === hash;
};

/**
 * Handle customer create/update webhook
 */
const handleCustomerWebhook = async (req, res) => {
  try {
    const shopifyDomain = req.headers['x-shopify-shop-domain'];
    const topic = req.headers['x-shopify-topic'];
    const customerData = req.body;

    // Find tenant by domain
    const tenant = await prisma.tenant.findUnique({
      where: { shopifyDomain }
    });

    if (!tenant) {
      return res.status(404).json({ message: 'Tenant not found' });
    }

    if (topic === 'customers/delete') {
      await prisma.customer.deleteMany({
        where: {
          tenantId: tenant.id,
          shopifyId: String(customerData.id)
        }
      });
    } else {
      await prisma.customer.upsert({
        where: {
          tenantId_shopifyId: {
            tenantId: tenant.id,
            shopifyId: String(customerData.id)
          }
        },
        create: {
          tenantId: tenant.id,
          shopifyId: String(customerData.id),
          email: customerData.email,
          firstName: customerData.first_name,
          lastName: customerData.last_name,
          phone: customerData.phone,
          ordersCount: customerData.orders_count || 0,
          totalSpent: parseFloat(customerData.total_spent) || 0,
          acceptsMarketing: customerData.accepts_marketing || false,
          shopifyCreatedAt: customerData.created_at ? new Date(customerData.created_at) : null,
          shopifyUpdatedAt: customerData.updated_at ? new Date(customerData.updated_at) : null
        },
        update: {
          email: customerData.email,
          firstName: customerData.first_name,
          lastName: customerData.last_name,
          phone: customerData.phone,
          ordersCount: customerData.orders_count || 0,
          totalSpent: parseFloat(customerData.total_spent) || 0,
          acceptsMarketing: customerData.accepts_marketing || false,
          shopifyUpdatedAt: customerData.updated_at ? new Date(customerData.updated_at) : null
        }
      });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Customer webhook error:', error);
    res.status(500).json({ message: 'Webhook processing failed' });
  }
};

/**
 * Handle order create/update webhook
 */
const handleOrderWebhook = async (req, res) => {
  try {
    const shopifyDomain = req.headers['x-shopify-shop-domain'];
    const topic = req.headers['x-shopify-topic'];
    const orderData = req.body;

    const tenant = await prisma.tenant.findUnique({
      where: { shopifyDomain }
    });

    if (!tenant) {
      return res.status(404).json({ message: 'Tenant not found' });
    }

    if (topic === 'orders/delete') {
      await prisma.order.deleteMany({
        where: {
          tenantId: tenant.id,
          shopifyId: String(orderData.id)
        }
      });
    } else {
      // Find customer
      let customerId = null;
      if (orderData.customer?.id) {
        const customer = await prisma.customer.findUnique({
          where: {
            tenantId_shopifyId: {
              tenantId: tenant.id,
              shopifyId: String(orderData.customer.id)
            }
          }
        });
        customerId = customer?.id;
      }

      const order = await prisma.order.upsert({
        where: {
          tenantId_shopifyId: {
            tenantId: tenant.id,
            shopifyId: String(orderData.id)
          }
        },
        create: {
          tenantId: tenant.id,
          shopifyId: String(orderData.id),
          orderNumber: String(orderData.order_number),
          email: orderData.email,
          financialStatus: orderData.financial_status,
          fulfillmentStatus: orderData.fulfillment_status,
          totalPrice: parseFloat(orderData.total_price) || 0,
          subtotalPrice: parseFloat(orderData.subtotal_price) || 0,
          totalTax: parseFloat(orderData.total_tax) || 0,
          totalDiscount: parseFloat(orderData.total_discounts) || 0,
          currency: orderData.currency || 'INR',
          itemCount: orderData.line_items?.length || 0,
          customerId,
          shopifyCreatedAt: orderData.created_at ? new Date(orderData.created_at) : null,
          shopifyUpdatedAt: orderData.updated_at ? new Date(orderData.updated_at) : null
        },
        update: {
          financialStatus: orderData.financial_status,
          fulfillmentStatus: orderData.fulfillment_status,
          totalPrice: parseFloat(orderData.total_price) || 0,
          subtotalPrice: parseFloat(orderData.subtotal_price) || 0,
          totalTax: parseFloat(orderData.total_tax) || 0,
          totalDiscount: parseFloat(orderData.total_discounts) || 0,
          customerId,
          shopifyUpdatedAt: orderData.updated_at ? new Date(orderData.updated_at) : null
        }
      });

      // Update line items
      if (orderData.line_items) {
        await prisma.lineItem.deleteMany({ where: { orderId: order.id } });
        
        for (const li of orderData.line_items) {
          await prisma.lineItem.create({
            data: {
              orderId: order.id,
              shopifyId: String(li.id),
              title: li.title,
              quantity: li.quantity,
              price: parseFloat(li.price) || 0,
              sku: li.sku,
              productId: li.product_id ? String(li.product_id) : null,
              variantId: li.variant_id ? String(li.variant_id) : null
            }
          });
        }
      }
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Order webhook error:', error);
    res.status(500).json({ message: 'Webhook processing failed' });
  }
};

/**
 * Handle product create/update webhook
 */
const handleProductWebhook = async (req, res) => {
  try {
    const shopifyDomain = req.headers['x-shopify-shop-domain'];
    const topic = req.headers['x-shopify-topic'];
    const productData = req.body;

    const tenant = await prisma.tenant.findUnique({
      where: { shopifyDomain }
    });

    if (!tenant) {
      return res.status(404).json({ message: 'Tenant not found' });
    }

    if (topic === 'products/delete') {
      await prisma.product.deleteMany({
        where: {
          tenantId: tenant.id,
          shopifyId: String(productData.id)
        }
      });
    } else {
      const primaryVariant = productData.variants?.[0];
      const primaryImage = productData.image?.src || productData.images?.[0]?.src;

      await prisma.product.upsert({
        where: {
          tenantId_shopifyId: {
            tenantId: tenant.id,
            shopifyId: String(productData.id)
          }
        },
        create: {
          tenantId: tenant.id,
          shopifyId: String(productData.id),
          title: productData.title,
          handle: productData.handle,
          productType: productData.product_type,
          vendor: productData.vendor,
          status: productData.status || 'active',
          imageUrl: primaryImage,
          price: primaryVariant?.price ? parseFloat(primaryVariant.price) : null,
          inventoryQuantity: primaryVariant?.inventory_quantity || 0,
          shopifyCreatedAt: productData.created_at ? new Date(productData.created_at) : null,
          shopifyUpdatedAt: productData.updated_at ? new Date(productData.updated_at) : null
        },
        update: {
          title: productData.title,
          handle: productData.handle,
          productType: productData.product_type,
          vendor: productData.vendor,
          status: productData.status || 'active',
          imageUrl: primaryImage,
          price: primaryVariant?.price ? parseFloat(primaryVariant.price) : null,
          inventoryQuantity: primaryVariant?.inventory_quantity || 0,
          shopifyUpdatedAt: productData.updated_at ? new Date(productData.updated_at) : null
        }
      });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Product webhook error:', error);
    res.status(500).json({ message: 'Webhook processing failed' });
  }
};

/**
 * Handle cart/checkout events
 */
const handleCartEvent = async (req, res) => {
  try {
    const shopifyDomain = req.headers['x-shopify-shop-domain'];
    const topic = req.headers['x-shopify-topic'];
    const eventData = req.body;

    const tenant = await prisma.tenant.findUnique({
      where: { shopifyDomain }
    });

    if (!tenant) {
      return res.status(404).json({ message: 'Tenant not found' });
    }

    // Determine event type
    let eventType;
    switch (topic) {
      case 'carts/create':
      case 'carts/update':
        eventType = 'ADD_TO_CART';
        break;
      case 'checkouts/create':
        eventType = 'CHECKOUT_STARTED';
        break;
      case 'checkouts/update':
        if (eventData.abandoned_checkout_url) {
          eventType = 'CART_ABANDONED';
        } else {
          eventType = 'CHECKOUT_STARTED';
        }
        break;
      default:
        eventType = 'PAGE_VIEW';
    }

    // Find customer if available
    let customerId = null;
    if (eventData.customer?.id) {
      const customer = await prisma.customer.findUnique({
        where: {
          tenantId_shopifyId: {
            tenantId: tenant.id,
            shopifyId: String(eventData.customer.id)
          }
        }
      });
      customerId = customer?.id;
    }

    await prisma.event.create({
      data: {
        tenantId: tenant.id,
        eventType,
        customerId,
        sessionId: eventData.token || eventData.cart_token,
        eventData: {
          total: eventData.total_price,
          itemCount: eventData.line_items?.length || 0,
          currency: eventData.currency
        }
      }
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Cart event error:', error);
    res.status(500).json({ message: 'Event processing failed' });
  }
};

module.exports = {
  handleCustomerWebhook,
  handleOrderWebhook,
  handleProductWebhook,
  handleCartEvent
};
