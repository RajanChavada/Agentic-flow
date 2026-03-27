import os
import stripe
from dotenv import load_dotenv

load_dotenv()

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
price_id = os.getenv("STRIPE_PRO_PRICE_ID")
user_id = "test-user-123"

print(f"Creating test checkout session for Price: {price_id} and User: {user_id}")

try:
    session = stripe.checkout.Session.create(
        mode="subscription",
        payment_method_types=["card"],
        line_items=[{"price": price_id, "quantity": 1}],
        success_url="https://example.com/success",
        cancel_url="https://example.com/cancel",
        metadata={"user_id": user_id},
    )
    print("\nSUCCESS! Visit this URL to complete the purchase (in test mode):")
    print(session.url)
    print("\nAfter you complete checkout, your 'stripe listen' should receive a session with REAL data.")
except Exception as e:
    print(f"Error: {e}")
