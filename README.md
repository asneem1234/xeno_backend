# Xeno Shopify Insights Platform

A multi-tenant Shopify Data Ingestion & Insights Service that helps enterprise retailers onboard, integrate, and analyze their customer data.

![Dashboard Preview](docs/dashboard-preview.png)

## 🚀 Features

### Core Features
- **Multi-Tenant Architecture**: Isolated data for each Shopify store with tenant-based access control
- **Shopify Data Ingestion**: Sync customers, orders, and products from Shopify stores
- **Real-time Webhooks**: Automatic data updates via Shopify webhooks
- **Scheduled Sync**: Automated background sync every 6 hours
- **Email Authentication**: JWT-based authentication for tenant onboarding

### Analytics Dashboard
- **Overview Stats**: Total customers, orders, revenue, products, and average order value
- **Growth Metrics**: Period-over-period comparison (30 days)
- **Revenue Trends**: Interactive line chart with date filtering
- **Order Status Distribution**: Visual breakdown of order statuses
- **Top Customers**: Bar chart showing top 5 customers by spend
- **Top Products**: Pie chart of best-selling products
- **Data Tables**: Paginated views for customers, orders, and products

### Bonus Features
- **Custom Events Tracking**: Cart abandoned, checkout started events
- **Date Range Filtering**: Filter orders by date range and status
- **Sync History**: View past sync operations and their status

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (HTML/JS)                        │
│                   Dashboard, Charts, Tables                      │
└─────────────────────────────┬───────────────────────────────────┘
                              │ HTTP/REST
┌─────────────────────────────▼───────────────────────────────────┐
│                     Express.js Backend                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Auth      │  │  Analytics  │  │   Shopify Service       │  │
│  │  Routes     │  │   Routes    │  │   (API + Webhooks)      │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
│                              │                                   │
│  ┌───────────────────────────▼─────────────────────────────┐    │
│  │              Prisma ORM (Multi-tenant Queries)           │    │
│  └───────────────────────────┬─────────────────────────────┘    │
└──────────────────────────────┼──────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────┐
│                      PostgreSQL Database                         │
│  ┌─────────┐ ┌──────────┐ ┌────────┐ ┌──────────┐ ┌──────────┐ │
│  │ Tenants │ │Customers │ │ Orders │ │ Products │ │  Events  │ │
│  └─────────┘ └──────────┘ └────────┘ └──────────┘ └──────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## 📊 Database Schema

### Core Tables

| Table | Description |
|-------|-------------|
| `Tenant` | Store/organization with Shopify connection |
| `User` | Users belonging to a tenant (email auth) |
| `Customer` | Shopify customers synced from API |
| `Order` | Orders with line items |
| `Product` | Products catalog |
| `Event` | Custom events (cart abandoned, etc.) |
| `SyncLog` | Sync operation history |

### Multi-Tenancy Implementation
- Each record has a `tenantId` foreign key
- Composite unique constraints: `(tenantId, shopifyId)`
- All queries are scoped by tenant automatically via middleware

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT (JSON Web Tokens)
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Charts**: Chart.js
- **UI Framework**: Bootstrap 5
- **Scheduling**: node-cron
- **Shopify Integration**: REST Admin API

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new tenant & admin user |
| POST | `/api/auth/login` | Login and get JWT token |
| GET | `/api/auth/profile` | Get current user profile |

### Shopify Integration
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/shopify/connect` | Connect Shopify with access token |
| POST | `/api/shopify/disconnect` | Disconnect Shopify |
| GET | `/api/shopify/status` | Check connection status |
| POST | `/api/shopify/sync` | Trigger manual sync |
| GET | `/api/shopify/sync-logs` | Get sync history |

### Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analytics/dashboard` | Dashboard summary stats |
| GET | `/api/analytics/growth` | Growth metrics (30-day comparison) |
| GET | `/api/analytics/orders-by-date` | Orders grouped by date |
| GET | `/api/analytics/revenue-trends` | Revenue trends |
| GET | `/api/analytics/top-customers` | Top customers by spend |
| GET | `/api/analytics/top-products` | Best selling products |
| GET | `/api/analytics/order-status` | Order status distribution |
| GET | `/api/analytics/customers` | Paginated customers list |
| GET | `/api/analytics/orders` | Paginated orders list |
| GET | `/api/analytics/products` | Paginated products list |

### Webhooks (Shopify)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/webhooks/customers` | Customer create/update/delete |
| POST | `/api/webhooks/orders` | Order create/update/delete |
| POST | `/api/webhooks/products` | Product create/update/delete |
| POST | `/api/webhooks/carts` | Cart events |
| POST | `/api/webhooks/checkouts` | Checkout events |

## 🚀 Setup Instructions

### Prerequisites
- Node.js 18+ 
- PostgreSQL 14+
- Shopify Development Store (for testing)

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/xeno-shopify-insights.git
cd xeno-shopify-insights
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your settings:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/xeno_shopify"
JWT_SECRET="your-secret-key"
SHOPIFY_API_KEY="your-shopify-api-key"
SHOPIFY_API_SECRET="your-shopify-api-secret"
```

### 3. Setup Database

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# (Optional) Seed with demo data
npm run seed
```

### 4. Run the Application

```bash
# Development mode
npm run dev

# Production mode
npm start
```

Visit `http://localhost:3000`

### Demo Credentials (after seeding)
- **Email**: admin@demo.com
- **Password**: password123

## 🔧 Shopify Store Setup

### 1. Create Development Store
1. Go to [Shopify Partners](https://partners.shopify.com)
2. Create a development store
3. Add dummy products, customers, and orders

### 2. Create Custom App
1. In your store admin, go to **Settings → Apps and sales channels**
2. Click **Develop apps** → **Create an app**
3. Configure Admin API scopes:
   - `read_customers`
   - `read_orders`
   - `read_products`
4. Install the app and copy the **Admin API access token**

### 3. Configure Webhooks (Optional)
For real-time updates, configure webhooks in Shopify:
- Topics: `customers/create`, `customers/update`, `orders/create`, etc.
- URL: `https://your-domain.com/api/webhooks/customers`

## 🎯 Assumptions

1. **Single Admin per Tenant**: Each tenant has one admin user initially
2. **Currency**: Default currency is INR (Indian Rupees)
3. **Sync Frequency**: Background sync runs every 6 hours
4. **Data Volume**: Designed for stores with <100k records (pagination implemented)
5. **Shopify API Version**: Using 2024-01 API version
6. **Browser Support**: Modern browsers (Chrome, Firefox, Safari, Edge)

## 🔮 Next Steps to Productionize

### Security Enhancements
- [ ] Encrypt Shopify access tokens at rest
- [ ] Implement rate limiting
- [ ] Add CSRF protection
- [ ] Implement audit logging
- [ ] Add 2FA for admin users

### Performance Improvements
- [ ] Add Redis caching for analytics queries
- [ ] Implement database connection pooling
- [ ] Add CDN for static assets
- [ ] Optimize database indexes

### Scalability
- [ ] Use message queue (RabbitMQ/Redis) for async ingestion
- [ ] Implement database read replicas
- [ ] Add horizontal scaling with load balancer
- [ ] Implement database sharding for large tenants

### Features
- [ ] Email notifications for sync failures
- [ ] Export data to CSV/Excel
- [ ] Custom dashboard widgets
- [ ] Role-based access control (RBAC)
- [ ] Multi-language support

### DevOps
- [ ] Add comprehensive test suite
- [ ] Implement CI/CD pipeline
- [ ] Add health check endpoints
- [ ] Implement log aggregation (ELK stack)
- [ ] Add monitoring and alerting (Prometheus/Grafana)

## 📁 Project Structure

```
xeno-shopify-insights/
├── prisma/
│   └── schema.prisma          # Database schema
├── public/
│   ├── index.html             # Login/Register page
│   ├── dashboard.html         # Main dashboard
│   └── js/
│       └── dashboard.js       # Frontend logic
├── src/
│   ├── config/
│   │   ├── database.js        # Prisma client
│   │   └── constants.js       # App configuration
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── analytics.controller.js
│   │   ├── shopify.controller.js
│   │   └── webhook.controller.js
│   ├── middleware/
│   │   ├── auth.middleware.js
│   │   └── validation.middleware.js
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── analytics.routes.js
│   │   ├── shopify.routes.js
│   │   ├── tenant.routes.js
│   │   └── webhook.routes.js
│   ├── services/
│   │   ├── shopify.service.js # Shopify API integration
│   │   └── scheduler.service.js
│   ├── seeds/
│   │   └── seed.js            # Demo data seeder
│   └── server.js              # Express app entry
├── .env.example
├── package.json
└── README.md
```

## 🙏 Acknowledgments

- [Shopify API Documentation](https://shopify.dev/docs/api)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Chart.js](https://www.chartjs.org/)
- [Bootstrap](https://getbootstrap.com/)

## 📝 License

MIT License - See LICENSE file for details.

---

Built with ❤️ for Xeno FDE Internship Assignment 2025
