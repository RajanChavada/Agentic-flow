#!/usr/bin/env python3
"""Quick test to verify Stripe integration works."""

import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from config import STRIPE_STARTER_PRICE_ID, STRIPE_PRO_PRICE_ID

print("=== Stripe Configuration Test ===")
print(f"STRIPE_STARTER_PRICE_ID: {STRIPE_STARTER_PRICE_ID}")
print(f"STRIPE_PRO_PRICE_ID: {STRIPE_PRO_PRICE_ID}")

# Check if the price IDs are non-empty
if STRIPE_STARTER_PRICE_ID and STRIPE_PRO_PRICE_ID:
    print("\n✅ Price IDs are configured correctly!")
else:
    print("\n❌ Price IDs are missing!")

# Test import
try:
    from routes.stripe import PRICE_TO_TIER
    print("\n✅ PRICE_TO_TIER mapping loaded successfully:")
    for price_id, tier in PRICE_TO_TIER.items():
        print(f"  {price_id} -> {tier}")
except Exception as e:
    print(f"\n❌ Error loading PRICE_TO_TIER: {e}")