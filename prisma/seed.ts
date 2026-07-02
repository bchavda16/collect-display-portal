import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // ─── Admin user ───────────────────────────────────────────────────────────
  const adminHash = await bcrypt.hash('Admin1234!', 12)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@collectanddisplay.com' },
    update: {},
    create: {
      email: 'admin@collectanddisplay.com',
      passwordHash: adminHash,
      role: 'ADMIN',
      isActive: true,
    },
  })
  console.log(`✓ Admin user: ${admin.email}`)

  // ─── Brands ───────────────────────────────────────────────────────────────
  const popMart = await prisma.brand.upsert({
    where: { slug: 'pop-mart' },
    update: {},
    create: {
      name: 'POP MART',
      slug: 'pop-mart',
      description: 'Leading designer toy brand from Beijing, home of Labubu, Molly, and SKULLPANDA.',
      
    },
  })

  const funko = await prisma.brand.upsert({
    where: { slug: 'funko' },
    update: {},
    create: {
      name: 'Funko',
      slug: 'funko',
      description: 'Pop culture collectibles and vinyl figures.',
      
    },
  })

  const sonnyAngel = await prisma.brand.upsert({
    where: { slug: 'sonny-angel' },
    update: {},
    create: {
      name: 'Sonny Angel',
      slug: 'sonny-angel',
      description: 'Miniature angel figurines from Dreams, Inc.',
      
    },
  })

  const smiski = await prisma.brand.upsert({
    where: { slug: 'smiski' },
    update: {},
    create: {
      name: 'SMISKI',
      slug: 'smiski',
      description: 'Glow-in-the-dark mystery figures by Dreams, Inc.',
      
    },
  })

  console.log(`✓ Brands: POP MART, Funko, Sonny Angel, SMISKI`)

  // ─── Products ─────────────────────────────────────────────────────────────
  const products = [
    // POP MART
    {
      brandId: popMart.id,
      name: 'Labubu The Monsters Series 1',
      sku: 'PM-LBB-001',
      productType: 'BLIND_BOX' as const,
      description: 'The original Labubu blind box series featuring 9 regular figures + 1 secret.',
      unitCostPence: 850,
      cduSize: 6,
      rrpPence: 1499,
      stockUnits: 144,
      lowStockThreshold: 24,
      status: 'ACTIVE' as const,
      badges: ['BEST_SELLER'] as const,
      weight: 180,
    },
    {
      brandId: popMart.id,
      name: 'SKULLPANDA Everyday Series',
      sku: 'PM-SKP-002',
      productType: 'BLIND_BOX' as const,
      description: 'SKULLPANDA Everyday blind box series — 12 designs + 1 secret.',
      unitCostPence: 950,
      cduSize: 6,
      rrpPence: 1699,
      stockUnits: 60,
      lowStockThreshold: 12,
      status: 'ACTIVE' as const,
      badges: ['NEW'] as const,
      weight: 200,
    },
    {
      brandId: popMart.id,
      name: 'Molly Zodiac Series',
      sku: 'PM-MLY-003',
      productType: 'BLIND_BOX' as const,
      description: '12 Molly zodiac sign figures + 1 hidden secret.',
      unitCostPence: 750,
      cduSize: 12,
      rrpPence: 1299,
      stockUnits: 8,
      lowStockThreshold: 24,
      status: 'LOW_STOCK' as const,
      badges: [] as const,
      weight: 150,
    },
    {
      brandId: popMart.id,
      name: 'Crybaby Mermaid Series',
      sku: 'PM-CRB-004',
      productType: 'BLIND_BOX' as const,
      description: 'CRYBABY mermaid-themed series with iridescent finishes.',
      unitCostPence: 1050,
      cduSize: 6,
      rrpPence: 1899,
      stockUnits: 0,
      lowStockThreshold: 12,
      status: 'OUT_OF_STOCK' as const,
      badges: ['EXCLUSIVE'] as const,
      weight: 220,
    },
    {
      brandId: popMart.id,
      name: 'Dimoo Space Travel Series',
      sku: 'PM-DMO-005',
      productType: 'BLIND_BOX' as const,
      description: 'Dimoo explores the cosmos in this 9-figure space series.',
      unitCostPence: 800,
      cduSize: 6,
      rrpPence: 1399,
      stockUnits: 200,
      lowStockThreshold: 24,
      status: 'ACTIVE' as const,
      badges: [] as const,
      weight: 175,
    },
    // Funko
    {
      brandId: funko.id,
      name: 'Funko Pop! Marvel Avengers Wave 3',
      sku: 'FNK-AVG-001',
      productType: 'FIGURE' as const,
      description: 'Wave 3 featuring Thor, Captain Marvel, and Black Panther.',
      unitCostPence: 650,
      cduSize: 6,
      rrpPence: 1299,
      stockUnits: 72,
      lowStockThreshold: 12,
      status: 'ACTIVE' as const,
      badges: [] as const,
      weight: 300,
    },
    {
      brandId: funko.id,
      name: 'Funko Pop! Disney Classics CDU',
      sku: 'FNK-DIS-002',
      productType: 'FIGURE' as const,
      description: 'Assorted Disney classic characters, 12 per CDU.',
      unitCostPence: 550,
      cduSize: 12,
      rrpPence: 999,
      stockUnits: 96,
      lowStockThreshold: 24,
      status: 'ACTIVE' as const,
      badges: ['BEST_SELLER'] as const,
      weight: 280,
    },
    // Sonny Angel
    {
      brandId: sonnyAngel.id,
      name: 'Sonny Angel Fruit Series 2024',
      sku: 'SA-FRT-001',
      productType: 'BLIND_BOX' as const,
      description: 'Summer fruit-themed Sonny Angel blind boxes — 12 designs.',
      unitCostPence: 700,
      cduSize: 12,
      rrpPence: 1299,
      stockUnits: 120,
      lowStockThreshold: 24,
      status: 'ACTIVE' as const,
      badges: ['NEW'] as const,
      weight: 120,
    },
    {
      brandId: sonnyAngel.id,
      name: 'Sonny Angel Winter Wonderland',
      sku: 'SA-WIN-002',
      productType: 'BLIND_BOX' as const,
      description: 'Limited winter series with foil packaging. 10 designs + 1 secret.',
      unitCostPence: 900,
      cduSize: 6,
      rrpPence: 1599,
      stockUnits: 0,
      lowStockThreshold: 12,
      status: 'COMING_SOON' as const,
      badges: ['COMING_SOON'] as const,
      weight: 130,
    },
    // SMISKI
    {
      brandId: smiski.id,
      name: 'SMISKI Desk Series Vol.3',
      sku: 'SMI-DSK-003',
      productType: 'BLIND_BOX' as const,
      description: 'Office-themed SMISKI figures — 8 designs, glow in the dark.',
      unitCostPence: 600,
      cduSize: 12,
      rrpPence: 999,
      stockUnits: 84,
      lowStockThreshold: 12,
      status: 'ACTIVE' as const,
      badges: [] as const,
      weight: 100,
    },
    {
      brandId: smiski.id,
      name: 'SMISKI Bath Series',
      sku: 'SMI-BTH-001',
      productType: 'BLIND_BOX' as const,
      description: 'Bathroom-themed SMISKI in towels and rubber ducks.',
      unitCostPence: 580,
      cduSize: 12,
      rrpPence: 999,
      stockUnits: 36,
      lowStockThreshold: 12,
      status: 'ACTIVE' as const,
      badges: ['BEST_SELLER'] as const,
      weight: 95,
    },
  ]

  for (const p of products) {
    await prisma.product.upsert({
      where: { sku: p.sku },
      update: { stockUnits: p.stockUnits, status: p.status },
      create: p,
    })
  }
  console.log(`✓ Products: ${products.length} created/updated`)

  // ─── Sample retailer ──────────────────────────────────────────────────────
  const retailerHash = await bcrypt.hash('Retailer1234!', 12)
  const retailerUser = await prisma.user.upsert({
    where: { email: 'demo@galaxycollectibles.co.uk' },
    update: {},
    create: {
      email: 'demo@galaxycollectibles.co.uk',
      passwordHash: retailerHash,
      role: 'RETAILER',
      isActive: true,
    },
  })

  const existingRetailer = await prisma.retailer.findUnique({ where: { userId: retailerUser.id } })
  if (!existingRetailer) {
    const retailer = await prisma.retailer.create({
      data: {
        userId: retailerUser.id,
        businessName: 'Galaxy Collectibles Ltd',
        contactName: 'Jamie Chen',
        phone: '+44 7700 900123',
        vatNumber: 'GB123456789',
        pricingTier: 'GOLD',
        paymentTerms: 'NET_30',
        creditLimitPence: 500000, // £5,000
        addresses: {
          create: {
            label: 'Head Office',
            line1: '42 Collector Street',
            city: 'Manchester',
            county: 'Greater Manchester',
            postcode: 'M1 2AB',
            country: 'GB',
            isDefault: true,
          },
        },
      },
    })

    // Sample announcements
    await prisma.announcement.createMany({
      data: [
        {
          title: 'New Labubu Series Arriving',
          content: 'We\'re excited to announce that the new Labubu The Monsters Series 2 will be available to order from next Monday. Stock is limited so get your orders in early.',
          type: 'INFO',
          isPinned: true,
          isActive: true,
        },
        {
          title: 'Summer Trading Hours',
          content: 'Our warehouse will be operating reduced hours 24 July–9 August. Orders placed during this period may take an extra 1–2 days to dispatch.',
          type: 'WARNING',
          isPinned: false,
          isActive: true,
        },
        {
          title: 'Free Shipping on Orders Over £500',
          content: 'For the month of July, all orders with a net value over £500 will qualify for free standard delivery. No code needed — applied automatically at checkout.',
          type: 'PROMO',
          isPinned: false,
          isActive: true,
          expiresAt: new Date('2025-07-31T23:59:59Z'),
        },
      ],
    })

    console.log(`✓ Demo retailer: ${retailerUser.email} (password: Retailer1234!)`)
    console.log(`✓ Announcements: 3 created`)
  } else {
    console.log(`✓ Demo retailer already exists, skipping`)
  }

  console.log('\n✅ Seed complete!')
  console.log('\nLogin credentials:')
  console.log('  Admin:    admin@collectanddisplay.com / Admin1234!')
  console.log('  Retailer: demo@galaxycollectibles.co.uk / Retailer1234!')
}

main()
  .catch(e => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
