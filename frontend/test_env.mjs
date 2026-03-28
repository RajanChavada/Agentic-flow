// Test Next.js environment variables
import { config } from 'dotenv';

// Load from .env.local
config({ path: '.env.local' });

console.log('=== Frontend Environment Variables Test ===');
console.log('NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID:', process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID);
console.log('NEXT_PUBLIC_STRIPE_PRO_PRICE_ID:', process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID);
console.log('NEXT_PUBLIC_PAYWALL_ENABLED:', process.env.NEXT_PUBLIC_PAYWALL_ENABLED);

if (process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID && process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID) {
    console.log('\n✅ Frontend Stripe price IDs are configured!');
} else {
    console.log('\n❌ Frontend Stripe price IDs are missing!');
}