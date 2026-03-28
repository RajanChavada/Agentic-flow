// Test frontend environment variables
console.log('=== Frontend Environment Variables Test ===');

// These should be available at build time
console.log('NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID:', process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID);
console.log('NEXT_PUBLIC_STRIPE_PRO_PRICE_ID:', process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID);
console.log('NEXT_PUBLIC_PAYWALL_ENABLED:', process.env.NEXT_PUBLIC_PAYWALL_ENABLED);

// Check if they're configured
if (process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID && process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID) {
    console.log('\n✅ Frontend Stripe price IDs are configured!');
} else {
    console.log('\n❌ Frontend Stripe price IDs are missing!');
}