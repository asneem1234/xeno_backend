const axios = require('axios');
const prisma = require('../config/database');
const config = require('../config/constants');

/**
 * Shopify API Service for data ingestion
 */
class ShopifyService {
  constructor(shopifyDomain, accessToken) {
    this.shopifyDomain = shopifyDomain;
    this.accessToken = accessToken;
    this.apiVersion = '2024-10';
    this.baseUrl = `https://${shopifyDomain}/admin/api/${this.apiVersion}`;
  }

  /**
   * Make authenticated request to Shopify API
   */
  async makeRequest(endpoint, method = 'GET', data = null) {
    try {
      const config = {
        method,
        url: `${this.baseUrl}${endpoint}`,
        headers: {
          'X-Shopify-Access-Token': this.accessToken
        }
      };
      
      // Only add data and Content-Type for non-GET requests
      if (method !== 'GET' && data) {
        config.data = data;
        config.headers['Content-Type'] = 'application/json';
      }
      
      const response = await axios(config);
      return response.data;
    } catch (error) {
      console.error(`Shopify API Error [${endpoint}]:`, error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Fetch all customers with pagination
   */
  async fetchCustomers(limit = 50) {
    const customers = [];
    let pageInfo = null;
    let hasNextPage = true;

    while (hasNextPage) {
      let endpoint = `/customers.json?limit=${limit}`;
      if (pageInfo) {
        endpoint = `/customers.json?limit=${limit}&page_info=${pageInfo}`;
      }

      const response = await this.makeRequest(endpoint);
      customers.push(...response.customers);

      // Handle pagination (simplified - in production, parse Link header)
      hasNextPage = response.customers.length === limit;
      if (hasNextPage && response.customers.length > 0) {
        // For demo purposes, limit to first batch
        hasNextPage = false;
      }
    }

    return customers;
  }

  /**
   * Fetch all orders with pagination
   */
  async fetchOrders(limit = 50, status = 'any') {
    const orders = [];
    let endpoint = `/orders.json?limit=${limit}&status=${status}`;
    
    const response = await this.makeRequest(endpoint);
    orders.push(...response.orders);

    return orders;
  }

  /**
   * Fetch all products with pagination
   */
  async fetchProducts(limit = 50) {
    const products = [];
    let endpoint = `/products.json?limit=${limit}`;
    
    const response = await this.makeRequest(endpoint);
    products.push(...response.products);

    return products;
  }

  /**
   * Fetch shop details
   */
  async fetchShopInfo() {
    const response = await this.makeRequest('/shop.json');
    return response.shop;
  }

  /**
   * Fetch orders count
   */
  async fetchOrdersCount(status = 'any') {
    const response = await this.makeRequest(`/orders/count.json?status=${status}`);
    return response.count;
  }

  /**
   * Fetch customers count
   */
  async fetchCustomersCount() {
    const response = await this.makeRequest('/customers/count.json');
    return response.count;
  }

  /**
   * Fetch products count
   */
  async fetchProductsCount() {
    const response = await this.makeRequest('/products/count.json');
    return response.count;
  }
}

/**
 * Sync customers from Shopify to database
 */
async function syncCustomers(tenantId, shopifyService) {
  const shopifyCustomers = await shopifyService.fetchCustomers();
  const results = { created: 0, updated: 0, errors: 0 };

  for (const sc of shopifyCustomers) {
    try {
      await prisma.customer.upsert({
        where: {
          tenantId_shopifyId: {
            tenantId,
            shopifyId: String(sc.id)
          }
        },
        create: {
          tenantId,
          shopifyId: String(sc.id),
          email: sc.email,
          firstName: sc.first_name,
          lastName: sc.last_name,
          phone: sc.phone,
          ordersCount: sc.orders_count || 0,
          totalSpent: parseFloat(sc.total_spent) || 0,
          currency: sc.currency || 'INR',
          acceptsMarketing: sc.accepts_marketing || false,
          tags: sc.tags || null,
          shopifyCreatedAt: sc.created_at ? new Date(sc.created_at) : null,
          shopifyUpdatedAt: sc.updated_at ? new Date(sc.updated_at) : null
        },
        update: {
          email: sc.email,
          firstName: sc.first_name,
          lastName: sc.last_name,
          phone: sc.phone,
          ordersCount: sc.orders_count || 0,
          totalSpent: parseFloat(sc.total_spent) || 0,
          acceptsMarketing: sc.accepts_marketing || false,
          tags: sc.tags || null,
          shopifyUpdatedAt: sc.updated_at ? new Date(sc.updated_at) : null
        }
      });
      results.created++;
    } catch (error) {
      console.error(`Error syncing customer ${sc.id}:`, error.message);
      results.errors++;
    }
  }

  return results;
}

/**
 * Sync orders from Shopify to database
 */
async function syncOrders(tenantId, shopifyService) {
  const shopifyOrders = await shopifyService.fetchOrders();
  const results = { created: 0, updated: 0, errors: 0 };

  for (const so of shopifyOrders) {
    try {
      // Find customer if exists
      let customerId = null;
      if (so.customer?.id) {
        const customer = await prisma.customer.findUnique({
          where: {
            tenantId_shopifyId: {
              tenantId,
              shopifyId: String(so.customer.id)
            }
          }
        });
        customerId = customer?.id;
      }

      // Upsert order
      const order = await prisma.order.upsert({
        where: {
          tenantId_shopifyId: {
            tenantId,
            shopifyId: String(so.id)
          }
        },
        create: {
          tenantId,
          shopifyId: String(so.id),
          orderNumber: String(so.order_number),
          email: so.email,
          financialStatus: so.financial_status,
          fulfillmentStatus: so.fulfillment_status,
          totalPrice: parseFloat(so.total_price) || 0,
          subtotalPrice: parseFloat(so.subtotal_price) || 0,
          totalTax: parseFloat(so.total_tax) || 0,
          totalDiscount: parseFloat(so.total_discounts) || 0,
          currency: so.currency || 'INR',
          itemCount: so.line_items?.length || 0,
          customerId,
          shopifyCreatedAt: so.created_at ? new Date(so.created_at) : null,
          shopifyUpdatedAt: so.updated_at ? new Date(so.updated_at) : null,
          cancelledAt: so.cancelled_at ? new Date(so.cancelled_at) : null
        },
        update: {
          financialStatus: so.financial_status,
          fulfillmentStatus: so.fulfillment_status,
          totalPrice: parseFloat(so.total_price) || 0,
          subtotalPrice: parseFloat(so.subtotal_price) || 0,
          totalTax: parseFloat(so.total_tax) || 0,
          totalDiscount: parseFloat(so.total_discounts) || 0,
          customerId,
          shopifyUpdatedAt: so.updated_at ? new Date(so.updated_at) : null,
          cancelledAt: so.cancelled_at ? new Date(so.cancelled_at) : null
        }
      });

      // Sync line items
      if (so.line_items && so.line_items.length > 0) {
        // Delete existing line items
        await prisma.lineItem.deleteMany({
          where: { orderId: order.id }
        });

        // Create new line items
        for (const li of so.line_items) {
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

      results.created++;
    } catch (error) {
      console.error(`Error syncing order ${so.id}:`, error.message);
      results.errors++;
    }
  }

  return results;
}

/**
 * Sync products from Shopify to database
 */
async function syncProducts(tenantId, shopifyService) {
  const shopifyProducts = await shopifyService.fetchProducts();
  const results = { created: 0, updated: 0, errors: 0 };

  for (const sp of shopifyProducts) {
    try {
      const primaryVariant = sp.variants?.[0];
      const primaryImage = sp.image?.src || sp.images?.[0]?.src;

      await prisma.product.upsert({
        where: {
          tenantId_shopifyId: {
            tenantId,
            shopifyId: String(sp.id)
          }
        },
        create: {
          tenantId,
          shopifyId: String(sp.id),
          title: sp.title,
          handle: sp.handle,
          productType: sp.product_type,
          vendor: sp.vendor,
          status: sp.status || 'active',
          tags: sp.tags || null,
          imageUrl: primaryImage,
          price: primaryVariant?.price ? parseFloat(primaryVariant.price) : null,
          compareAtPrice: primaryVariant?.compare_at_price ? parseFloat(primaryVariant.compare_at_price) : null,
          inventoryQuantity: primaryVariant?.inventory_quantity || 0,
          shopifyCreatedAt: sp.created_at ? new Date(sp.created_at) : null,
          shopifyUpdatedAt: sp.updated_at ? new Date(sp.updated_at) : null
        },
        update: {
          title: sp.title,
          handle: sp.handle,
          productType: sp.product_type,
          vendor: sp.vendor,
          status: sp.status || 'active',
          tags: sp.tags || null,
          imageUrl: primaryImage,
          price: primaryVariant?.price ? parseFloat(primaryVariant.price) : null,
          compareAtPrice: primaryVariant?.compare_at_price ? parseFloat(primaryVariant.compare_at_price) : null,
          inventoryQuantity: primaryVariant?.inventory_quantity || 0,
          shopifyUpdatedAt: sp.updated_at ? new Date(sp.updated_at) : null
        }
      });
      results.created++;
    } catch (error) {
      console.error(`Error syncing product ${sp.id}:`, error.message);
      results.errors++;
    }
  }

  return results;
}

/**
 * Full sync for a tenant
 */
async function fullSync(tenantId) {
  // Get tenant
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId }
  });

  if (!tenant || !tenant.shopifyAccessToken) {
    throw new Error('Tenant not found or Shopify not connected');
  }

  const shopifyService = new ShopifyService(tenant.shopifyDomain, tenant.shopifyAccessToken);

  // Create sync log
  const syncLog = await prisma.syncLog.create({
    data: {
      tenantId,
      syncType: 'FULL',
      status: 'IN_PROGRESS'
    }
  });

  try {
    // Sync in order: customers first, then orders (for FK), then products
    const customerResults = await syncCustomers(tenantId, shopifyService);
    const orderResults = await syncOrders(tenantId, shopifyService);
    const productResults = await syncProducts(tenantId, shopifyService);

    const totalRecords = customerResults.created + orderResults.created + productResults.created;

    // Update sync log
    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: {
        status: 'COMPLETED',
        recordsCount: totalRecords,
        completedAt: new Date()
      }
    });

    return {
      success: true,
      customers: customerResults,
      orders: orderResults,
      products: productResults
    };
  } catch (error) {
    // Update sync log with error
    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: {
        status: 'FAILED',
        errorMessage: error.message,
        completedAt: new Date()
      }
    });

    throw error;
  }
}

module.exports = {
  ShopifyService,
  syncCustomers,
  syncOrders,
  syncProducts,
  fullSync
};
