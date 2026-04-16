const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const DB_URL = process.env.DATABASE_URL || 'postgresql://postgres@localhost:5432/smartprice';
const adapter = new PrismaPg({ connectionString: DB_URL });
const prisma = new PrismaClient({ adapter });

const legacyAutoAssignedImageUrls = [
  'https://images.unsplash.com/photo-1511707267537-b85faf00021e?w=500&h=500&fit=crop',
  'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=500&h=500&fit=crop',
  'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&h=500&fit=crop',
  'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=500&h=500&fit=crop',
  'https://images.unsplash.com/photo-1533821736289-77cfe5aae0dd?w=500&h=500&fit=crop',
  'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=500&h=500&fit=crop',
  'https://images.unsplash.com/photo-1525275335684-4ca7f5e99737?w=500&h=500&fit=crop',
  'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=500&h=500&fit=crop',
  'https://images.unsplash.com/photo-1587829191301-d06b92b52d92?w=500&h=500&fit=crop',
  'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=500&h=500&fit=crop',
  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&h=500&fit=crop'
];

async function main() {
  const result = await prisma.product.updateMany({
    where: {
      imageUrl: {
        in: legacyAutoAssignedImageUrls
      }
    },
    data: {
      imageUrl: ''
    }
  });

  console.log(`Cleared legacy image URLs for ${result.count} products.`);
}

main()
  .catch((error) => {
    console.error('Failed to repair product images:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
