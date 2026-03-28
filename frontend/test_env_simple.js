// Test environment variables (Next.js will inject these)
console.log('=== Frontend Environment Variables Test ===');

// In a Next.js app, these would be available at build time
const starterPrice = process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID;
const proPrice = process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID;

console.log('NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID:', starterPrice);
console.log('NEXT_PUBLIC_STRIPE_PRO_PRICE_ID:', proPrice);
console.log('NEXT_PUBLIC_PAYWALL_ENABLED:', process.env.NEXT_PUBLIC_PAYWALL_ENABLED);

if (starterPrice && proPrice) {
    console.log('\n✅ Frontend Stripe price IDs are configured!');
} else {
    console.log('\n❌ Frontend Stripe price IDs are missing!');
    console.log('\nThis usually means:');
    console.log('1. The .env.local file is missing');
    console.log('2. The .env.local file exists but doesn\'t have the variables');
    console.log('3. You need to restart the Next.js dev server after adding the variables');
}