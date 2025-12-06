const { PrismaClient } = require('@prisma/client');

// Create a single Prisma client instance
// Only log errors to keep console clean
const prisma = new PrismaClient({
  log: ['error'],
});

module.exports = prisma;
