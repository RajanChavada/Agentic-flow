"""Stripe webhook handler.

CRITICAL: The raw request body must be read BEFORE any middleware
parses it. Stripe signature verification requires the exact bytes.
"""

import os
import logging
from typing import Dict, Any

import stripe
from fastapi import APIRouter, Request, HTTPException
from supabase import create_client

logger = logging.getLogger("uvicorn.error")

router = APIRouter()

stripe.api_key = os.environ.get("STRIPE_SECRET_KEY", "")
stripe.api_version = "2026-03-25.dahlia"
WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")

# Use service role key — bypasses RLS for webhook writes
supabase_url = os.environ.get("SUPABASE_URL", "")
supabase_service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
supabase = None
if supabase_url and supabase_service_key:
    supabase = create_client(supabase_url, supabase_service_key)

PRICE_TO_TIER = {
    os.environ.get("STRIPE_STARTER_PRICE_ID", ""): "starter",
    os.environ.get("STRIPE_PRO_PRICE_ID", ""): "pro",
}


@router.post("/api/stripe/webhook")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events with signature verification."""
    # Read raw body — required for signature verification
    body = await request.body()
    sig_header = request.headers.get("stripe-signature")

    if not sig_header:
        raise HTTPException(status_code=400, detail="Missing stripe-signature header")

    if not WEBHOOK_SECRET:
        logger.error("STRIPE_WEBHOOK_SECRET not configured")
        raise HTTPException(status_code=500, detail="Webhook secret not configured")

    try:
        event = stripe.Webhook.construct_event(body, sig_header, WEBHOOK_SECRET)
    except stripe.error.SignatureVerificationError:
        logger.warning("Invalid Stripe webhook signature")
        raise HTTPException(status_code=400, detail="Invalid signature")
    except Exception as e:
        logger.error(f"Error constructing Stripe event: {e}")
        raise HTTPException(status_code=400, detail=str(e))

    event_type = event["type"]
    data = event["data"]["object"]

    logger.info(f"Processing Stripe webhook: {event_type}")

    try:
        if event_type == "checkout.session.completed":
            await _handle_checkout_completed(data)

        elif event_type == "customer.subscription.updated":
            await _handle_subscription_updated(data)

        elif event_type == "customer.subscription.deleted":
            await _handle_subscription_deleted(data)

        elif event_type == "invoice.payment_failed":
            await _handle_payment_failed(data)
        else:
            logger.info(f"Unhandled webhook event type: {event_type}")
    except Exception as e:
        logger.error(f"Error handling webhook {event_type}: {e}", exc_info=True)
        # Still return 200 to Stripe to prevent retries for business logic errors
        # Stripe will retry on 4xx/5xx responses

    return {"status": "ok"}


async def _handle_checkout_completed(session: Dict[str, Any]):
    """Create or update subscription row after successful checkout."""
    if not supabase:
        logger.error("Supabase client not initialized")
        return
    logger.info(f"Session data: {session}")
    logger.info(f"Session object type: {type(session)}")
    logger.info(f"Session metadata: {getattr(session, 'metadata', 'N/A')}")
    logger.info(f"Session customer: {getattr(session, 'customer', 'N/A')}")
    logger.info(f"Session subscription: {getattr(session, 'subscription', 'N/A')}")

    metadata = getattr(session, "metadata", {})
    user_id = getattr(metadata, "user_id", None)
    stripe_customer_id = getattr(session, "customer", None)
    stripe_subscription_id = getattr(session, "subscription", None)

    if not all([user_id, stripe_customer_id, stripe_subscription_id]):
        logger.warning(
            f"Missing data in checkout.session.completed: "
            f"user_id={user_id}, customer={stripe_customer_id}, subscription={stripe_subscription_id}"
        )
        return

    try:
        # Retrieve the subscription to get the price/tier
        sub = stripe.Subscription.retrieve(stripe_subscription_id)
        
        # Extremely safe attribute access
        price_id = getattr(getattr(getattr(getattr(sub, "items", None), "data", [None])[0], "price", None), "id", None)
        tier_id = PRICE_TO_TIER.get(price_id, "free")
        current_period_end = getattr(sub, "current_period_end", None)

        # Upsert — idempotent on stripe_subscription_id
        supabase.table("subscriptions").upsert({
            "user_id": user_id,
            "stripe_customer_id": stripe_customer_id,
            "stripe_subscription_id": stripe_subscription_id,
            "tier_id": tier_id,
            "status": "active",
            "current_period_end": current_period_end,
        }, on_conflict="stripe_subscription_id").execute()

        logger.info(f"Created subscription for user {user_id}, tier {tier_id}")
    except Exception as e:
        logger.error(f"Error in _handle_checkout_completed: {e}", exc_info=True)


async def _handle_subscription_updated(sub: Dict[str, Any]):
    """Sync tier and period when subscription changes."""
    if not supabase:
        logger.error("Supabase client not initialized")
        return

    stripe_subscription_id = getattr(sub, "id", None)
    if not stripe_subscription_id:
        logger.warning("Missing subscription ID in customer.subscription.updated")
        return

    try:
        # Safe access for nested price_id
        items = getattr(sub, "items", None)
        data = getattr(items, "data", [])
        price_id = getattr(getattr(data[0], "price", None), "id", None) if data else None
        tier_id = PRICE_TO_TIER.get(price_id, "free")

        supabase.table("subscriptions").update({
            "tier_id": tier_id,
            "status": getattr(sub, "status", "active"),
            "current_period_end": getattr(sub, "current_period_end", None),
        }).eq("stripe_subscription_id", stripe_subscription_id).execute()

        logger.info(f"Updated subscription {stripe_subscription_id}, tier {tier_id}")
    except Exception as e:
        logger.error(f"Error in _handle_subscription_updated: {e}", exc_info=True)


async def _handle_subscription_deleted(sub: Dict[str, Any]):
    """Downgrade to free when subscription is cancelled."""
    if not supabase:
        logger.error("Supabase client not initialized")
        return

    stripe_subscription_id = getattr(sub, "id", None)
    if not stripe_subscription_id:
        logger.warning("Missing subscription ID in customer.subscription.deleted")
        return

    try:
        supabase.table("subscriptions").update({
            "tier_id": "free",
            "status": "cancelled",
            "stripe_subscription_id": None,
            "current_period_end": None,
        }).eq("stripe_subscription_id", stripe_subscription_id).execute()

        logger.info(f"Cancelled subscription {stripe_subscription_id}, downgraded to free")
    except Exception as e:
        logger.error(f"Error in _handle_subscription_deleted: {e}", exc_info=True)


async def _handle_payment_failed(invoice: Dict[str, Any]):
    """Mark subscription as past_due on payment failure."""
    if not supabase:
        logger.error("Supabase client not initialized")
        return

    stripe_subscription_id = getattr(invoice, "subscription", None)
    if not stripe_subscription_id:
        logger.warning("No subscription ID in invoice.payment_failed")
        return

    try:
        supabase.table("subscriptions").update({
            "status": "past_due",
        }).eq("stripe_subscription_id", stripe_subscription_id).execute()

        logger.info(f"Marked subscription {stripe_subscription_id} as past_due")
    except Exception as e:
        logger.error(f"Error in _handle_payment_failed: {e}", exc_info=True)


@router.post("/api/stripe/create-checkout-session")
async def create_checkout_session(request: Request):
    """Create a Stripe Checkout session for subscription purchase."""
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    price_id = body.get("priceId")
    user_id = body.get("userId")

    if not price_id or not user_id:
        raise HTTPException(status_code=400, detail="priceId and userId required")

    # Prioritize frontendUrl from body for multi-deployment support, fallback to ENV
    frontend_url = body.get("frontendUrl") or os.environ.get("FRONTEND_URL", "http://localhost:3000")

    try:
        session = stripe.checkout.Session.create(
            mode="subscription",
            payment_method_types=["card"],
            line_items=[{"price": price_id, "quantity": 1}],
            success_url=f"{frontend_url}/editor?checkout=success",
            cancel_url=f"{frontend_url}/pricing?checkout=cancelled",
            metadata={"user_id": user_id},
        )
        return {"url": session.url}
    except Exception as e:
        logger.error(f"Error creating checkout session: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/stripe/create-portal-session")
async def create_portal_session(request: Request):
    """Create a Stripe Customer Portal session for subscription management."""
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    stripe_customer_id = body.get("stripeCustomerId")

    if not stripe_customer_id:
        raise HTTPException(status_code=400, detail="stripeCustomerId required")

    frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")

    try:
        session = stripe.billing_portal.Session.create(
            customer=stripe_customer_id,
            return_url=f"{frontend_url}/editor",
        )
        return {"url": session.url}
    except Exception as e:
        logger.error(f"Error creating portal session: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
