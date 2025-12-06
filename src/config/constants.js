module.exports = {
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  shopify: {
    apiKey: process.env.SHOPIFY_API_KEY,
    apiSecret: process.env.SHOPIFY_API_SECRET,
    scopes: process.env.SHOPIFY_SCOPES?.split(',') || ['read_customers', 'read_orders', 'read_products'],
    hostUrl: process.env.SHOPIFY_HOST,
    webhookSecret: process.env.SHOPIFY_WEBHOOK_SECRET,
  },
  sync: {
    // Cron schedule for auto-sync (every 6 hours by default)
    cronSchedule: process.env.SYNC_CRON_SCHEDULE || '0 */6 * * *',
    // Batch size for API pagination
    batchSize: 50,
  }
};
