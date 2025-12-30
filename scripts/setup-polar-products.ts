/**
 * Setup Polar.sh Products Script
 * Run with: npx ts-node scripts/setup-polar-products.ts
 * Or: npx dotenv -e .env.local -- npx tsx scripts/setup-polar-products.ts
 */

import { Polar } from '@polar-sh/sdk';

const polar = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN,
});

const PRODUCTS_TO_CREATE = [
  {
    name: 'Starter Plan',
    description: 'For hobbyists - 2,000 credits per month',
    recurringInterval: 'month' as const,
    prices: [
      {
        type: 'recurring' as const,
        recurringInterval: 'month' as const,
        priceAmount: 900, // $9.00 in cents
        priceCurrency: 'usd',
      },
    ],
    metadata: {
      plan: 'starter',
      credits: '2000',
    },
  },
  {
    name: 'Pro Plan',
    description: 'For regular users - 8,000 credits per month',
    recurringInterval: 'month' as const,
    prices: [
      {
        type: 'recurring' as const,
        recurringInterval: 'month' as const,
        priceAmount: 2900, // $29.00 in cents
        priceCurrency: 'usd',
      },
    ],
    metadata: {
      plan: 'pro',
      credits: '8000',
    },
  },
  {
    name: 'Studio Plan',
    description: 'For creators - 25,000 credits per month',
    recurringInterval: 'month' as const,
    prices: [
      {
        type: 'recurring' as const,
        recurringInterval: 'month' as const,
        priceAmount: 7900, // $79.00 in cents
        priceCurrency: 'usd',
      },
    ],
    metadata: {
      plan: 'studio',
      credits: '25000',
    },
  },
];

async function setupProducts() {
  console.log('🚀 Setting up Polar.sh products...\n');

  if (!process.env.POLAR_ACCESS_TOKEN) {
    console.error('❌ POLAR_ACCESS_TOKEN environment variable is required');
    process.exit(1);
  }

  // First, get the organization ID
  console.log('📋 Fetching organization...');

  try {
    const orgs = await polar.organizations.list({});

    if (!orgs.result.items.length) {
      console.error('❌ No organizations found. Please create one at https://polar.sh');
      process.exit(1);
    }

    const org = orgs.result.items[0];
    console.log(`✅ Using organization: ${org.name} (${org.id})\n`);

    // Create each product
    const createdProducts: { name: string; id: string }[] = [];

    for (const productConfig of PRODUCTS_TO_CREATE) {
      console.log(`📦 Creating product: ${productConfig.name}...`);

      try {
        const product = await polar.products.create({
          organizationId: org.id,
          name: productConfig.name,
          description: productConfig.description,
          prices: productConfig.prices,
          isRecurring: true,
        });

        createdProducts.push({
          name: productConfig.name,
          id: product.id,
        });

        console.log(`   ✅ Created with ID: ${product.id}`);
      } catch (error: any) {
        console.error(`   ❌ Failed to create ${productConfig.name}:`, error.message);
      }
    }

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📋 SUMMARY - Add these to your .env.local:\n');

    createdProducts.forEach((p) => {
      const envVar = p.name.toUpperCase().replace(' PLAN', '').replace(' ', '_');
      console.log(`POLAR_PRODUCT_${envVar}=${p.id}`);
    });

    console.log('\n' + '='.repeat(60));
    console.log('✅ Done! Update your .env.local with the product IDs above.');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

setupProducts();
