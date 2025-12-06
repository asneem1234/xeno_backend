const prisma = require('../config/database');

/**
 * Get dashboard summary stats
 */
const getDashboardStats = async (req, res) => {
  try {
    const tenantId = req.tenantId;

    // Get counts and aggregates in parallel
    const [
      customersCount,
      ordersCount,
      productsCount,
      revenueResult,
      avgOrderValue
    ] = await Promise.all([
      prisma.customer.count({ where: { tenantId } }),
      prisma.order.count({ where: { tenantId } }),
      prisma.product.count({ where: { tenantId } }),
      prisma.order.aggregate({
        where: { tenantId, financialStatus: 'paid' },
        _sum: { totalPrice: true }
      }),
      prisma.order.aggregate({
        where: { tenantId, financialStatus: 'paid' },
        _avg: { totalPrice: true }
      })
    ]);

    res.json({
      success: true,
      data: {
        totalCustomers: customersCount,
        totalOrders: ordersCount,
        totalProducts: productsCount,
        totalRevenue: revenueResult._sum.totalPrice || 0,
        averageOrderValue: avgOrderValue._avg.totalPrice || 0
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get dashboard stats'
    });
  }
};

/**
 * Get orders by date with filtering
 */
const getOrdersByDate = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { startDate, endDate, groupBy = 'day' } = req.query;

    // Build date filter
    const dateFilter = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate);
    }

    // Get orders grouped by date
    const orders = await prisma.order.findMany({
      where: {
        tenantId,
        shopifyCreatedAt: Object.keys(dateFilter).length > 0 ? dateFilter : undefined
      },
      select: {
        id: true,
        totalPrice: true,
        shopifyCreatedAt: true,
        financialStatus: true
      },
      orderBy: { shopifyCreatedAt: 'asc' }
    });

    // Group orders by date
    const groupedData = {};
    orders.forEach(order => {
      if (!order.shopifyCreatedAt) return;
      
      let dateKey;
      const date = new Date(order.shopifyCreatedAt);
      
      if (groupBy === 'month') {
        dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      } else if (groupBy === 'week') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        dateKey = weekStart.toISOString().split('T')[0];
      } else {
        dateKey = date.toISOString().split('T')[0];
      }

      if (!groupedData[dateKey]) {
        groupedData[dateKey] = { date: dateKey, orders: 0, revenue: 0 };
      }
      groupedData[dateKey].orders++;
      groupedData[dateKey].revenue += parseFloat(order.totalPrice) || 0;
    });

    res.json({
      success: true,
      data: Object.values(groupedData)
    });
  } catch (error) {
    console.error('Orders by date error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get orders by date'
    });
  }
};

/**
 * Get top customers by spend
 */
const getTopCustomers = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const limit = parseInt(req.query.limit) || 5;

    const topCustomers = await prisma.customer.findMany({
      where: { tenantId },
      orderBy: { totalSpent: 'desc' },
      take: limit,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        totalSpent: true,
        ordersCount: true
      }
    });

    res.json({
      success: true,
      data: topCustomers.map(c => ({
        ...c,
        name: `${c.firstName || ''} ${c.lastName || ''}`.trim() || c.email || 'Unknown'
      }))
    });
  } catch (error) {
    console.error('Top customers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get top customers'
    });
  }
};

/**
 * Get revenue trends
 */
const getRevenueTrends = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { period = '30' } = req.query; // days

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    const orders = await prisma.order.findMany({
      where: {
        tenantId,
        shopifyCreatedAt: { gte: startDate },
        financialStatus: 'paid'
      },
      select: {
        totalPrice: true,
        shopifyCreatedAt: true
      },
      orderBy: { shopifyCreatedAt: 'asc' }
    });

    // Group by date
    const trends = {};
    orders.forEach(order => {
      if (!order.shopifyCreatedAt) return;
      const dateKey = order.shopifyCreatedAt.toISOString().split('T')[0];
      
      if (!trends[dateKey]) {
        trends[dateKey] = { date: dateKey, revenue: 0, orders: 0 };
      }
      trends[dateKey].revenue += parseFloat(order.totalPrice) || 0;
      trends[dateKey].orders++;
    });

    res.json({
      success: true,
      data: Object.values(trends)
    });
  } catch (error) {
    console.error('Revenue trends error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get revenue trends'
    });
  }
};

/**
 * Get top products by orders
 */
const getTopProducts = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const limit = parseInt(req.query.limit) || 5;

    // Get line items with counts
    const lineItems = await prisma.lineItem.groupBy({
      by: ['title'],
      where: {
        order: { tenantId }
      },
      _sum: { quantity: true },
      _count: true,
      orderBy: { _sum: { quantity: 'desc' } },
      take: limit
    });

    res.json({
      success: true,
      data: lineItems.map(item => ({
        title: item.title,
        totalQuantity: item._sum.quantity || 0,
        orderCount: item._count
      }))
    });
  } catch (error) {
    console.error('Top products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get top products'
    });
  }
};

/**
 * Get order status distribution
 */
const getOrderStatusDistribution = async (req, res) => {
  try {
    const tenantId = req.tenantId;

    const statusCounts = await prisma.order.groupBy({
      by: ['financialStatus'],
      where: { tenantId },
      _count: true
    });

    res.json({
      success: true,
      data: statusCounts.map(s => ({
        status: s.financialStatus || 'unknown',
        count: s._count
      }))
    });
  } catch (error) {
    console.error('Order status distribution error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get order status distribution'
    });
  }
};

/**
 * Get customers list with pagination
 */
const getCustomers = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          totalSpent: true,
          ordersCount: true,
          createdAt: true
        }
      }),
      prisma.customer.count({ where: { tenantId } })
    ]);

    res.json({
      success: true,
      data: customers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get customers'
    });
  }
};

/**
 * Get orders list with pagination
 */
const getOrders = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { status, startDate, endDate } = req.query;

    const where = { tenantId };
    if (status) where.financialStatus = status;
    if (startDate || endDate) {
      where.shopifyCreatedAt = {};
      if (startDate) where.shopifyCreatedAt.gte = new Date(startDate);
      if (endDate) where.shopifyCreatedAt.lte = new Date(endDate);
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { shopifyCreatedAt: 'desc' },
        skip,
        take: limit,
        include: {
          customer: {
            select: { firstName: true, lastName: true, email: true }
          }
        }
      }),
      prisma.order.count({ where })
    ]);

    res.json({
      success: true,
      data: orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get orders'
    });
  }
};

/**
 * Get products list with pagination
 */
const getProducts = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.product.count({ where: { tenantId } })
    ]);

    res.json({
      success: true,
      data: products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get products'
    });
  }
};

/**
 * Get growth metrics (comparing periods)
 */
const getGrowthMetrics = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    // Current period (last 30 days)
    const [currentRevenue, currentOrders, currentCustomers] = await Promise.all([
      prisma.order.aggregate({
        where: {
          tenantId,
          shopifyCreatedAt: { gte: thirtyDaysAgo },
          financialStatus: 'paid'
        },
        _sum: { totalPrice: true }
      }),
      prisma.order.count({
        where: {
          tenantId,
          shopifyCreatedAt: { gte: thirtyDaysAgo }
        }
      }),
      prisma.customer.count({
        where: {
          tenantId,
          createdAt: { gte: thirtyDaysAgo }
        }
      })
    ]);

    // Previous period (30-60 days ago)
    const [previousRevenue, previousOrders, previousCustomers] = await Promise.all([
      prisma.order.aggregate({
        where: {
          tenantId,
          shopifyCreatedAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
          financialStatus: 'paid'
        },
        _sum: { totalPrice: true }
      }),
      prisma.order.count({
        where: {
          tenantId,
          shopifyCreatedAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo }
        }
      }),
      prisma.customer.count({
        where: {
          tenantId,
          createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo }
        }
      })
    ]);

    // Calculate growth percentages
    const calculateGrowth = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous * 100).toFixed(1);
    };

    const currentRev = parseFloat(currentRevenue._sum.totalPrice) || 0;
    const previousRev = parseFloat(previousRevenue._sum.totalPrice) || 0;

    res.json({
      success: true,
      data: {
        revenue: {
          current: currentRev,
          previous: previousRev,
          growth: calculateGrowth(currentRev, previousRev)
        },
        orders: {
          current: currentOrders,
          previous: previousOrders,
          growth: calculateGrowth(currentOrders, previousOrders)
        },
        customers: {
          current: currentCustomers,
          previous: previousCustomers,
          growth: calculateGrowth(currentCustomers, previousCustomers)
        }
      }
    });
  } catch (error) {
    console.error('Growth metrics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get growth metrics'
    });
  }
};

module.exports = {
  getDashboardStats,
  getOrdersByDate,
  getTopCustomers,
  getRevenueTrends,
  getTopProducts,
  getOrderStatusDistribution,
  getCustomers,
  getOrders,
  getProducts,
  getGrowthMetrics
};
