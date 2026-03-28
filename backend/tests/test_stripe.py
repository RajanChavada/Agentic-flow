"""Stripe integration tests.

Tests cover:
- Webhook signature verification
- Event handlers (checkout.session.completed, subscription updates, payment failures)
- Checkout session endpoint
- Portal session endpoint
- Error handling and edge cases
"""

import os
import time
import hmac
import hashlib
from unittest.mock import patch, MagicMock, AsyncMock
import sys

import pytest
from fastapi.testclient import TestClient


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(scope="session", autouse=True)
def set_env():
    """Set environment variables for Stripe integration."""
    os.environ["STRIPE_SECRET_KEY"] = "sk_test_123"
    os.environ["STRIPE_WEBHOOK_SECRET"] = "whsec_test_secret"
    os.environ["STRIPE_STARTER_PRICE_ID"] = "price_starter_123"
    os.environ["STRIPE_PRO_PRICE_ID"] = "price_pro_123"
    os.environ["FRONTEND_URL"] = "http://localhost:3000"
    os.environ["SUPABASE_URL"] = "https://test.supabase.co"
    os.environ["SUPABASE_SERVICE_ROLE_KEY"] = "test_service_key"


@pytest.fixture()
def client(monkeypatch, set_env):
    """TestClient with Stripe routes enabled."""
    # Need to reload modules to pick up env vars cleanly
    # Clear any cached imports
    for mod in list(sys.modules.keys()):
        if mod.startswith("routes.stripe") or mod == "main":
            del sys.modules[mod]

    import sys
    import os
    sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from main import app
    return TestClient(app)


@pytest.fixture()
def mock_stripe():
    """Create a mock stripe module."""
    with patch("routes.stripe.stripe") as mock_stripe:
        # Webhook construct_event
        def mock_construct_event(body, sig_header, secret):
            return {"type": "checkout.session.completed", "data": {"object": {}}}
        mock_stripe.Webhook.construct_event = mock_construct_event

        # Subscription retrieve - return a dict-like mock with proper nested access
        sub_dict = {
            "items": {"data": [{"price": {"id": "price_starter_123"}}]},
            "current_period_end": int(time.time()) + 30 * 24 * 3600,
            "status": "active",
            "id": "sub_123",
        }
        mock_stripe.Subscription.retrieve.return_value = sub_dict

        # Checkout Session create
        mock_checkout_session = MagicMock()
        mock_checkout_session.url = "https://checkout.stripe.com/session"
        mock_stripe.checkout.Session.create.return_value = mock_checkout_session

        # Portal Session create
        mock_portal_session = MagicMock()
        mock_portal_session.url = "https://billing.stripe.com/session"
        mock_stripe.billing_portal.Session.create.return_value = mock_portal_session

        yield mock_stripe


@pytest.fixture()
def mock_supabase():
    """Mock the supabase client."""
    with patch("routes.stripe.supabase") as mock_supabase:
        mock_table = MagicMock()
        mock_table.upsert = MagicMock(return_value=mock_table)
        mock_table.update = MagicMock(return_value=mock_table)
        mock_table.eq = MagicMock(return_value=mock_table)
        mock_table.execute = MagicMock()
        mock_supabase.table.return_value = mock_table
        yield mock_supabase


def generate_webhook_signature(payload: bytes, secret: str, timestamp: int = None) -> str:
    """Generate a valid Stripe webhook signature for testing."""
    if timestamp is None:
        timestamp = int(time.time())

    signed_payload = f"{timestamp}.{payload.decode('utf-8')}".encode('utf-8')
    signature = hmac.new(secret.encode('utf-8'), signed_payload, hashlib.sha256).hexdigest()
    return f"t={timestamp},v1={signature}"


# ---------------------------------------------------------------------------
# Webhook signature verification tests
# ---------------------------------------------------------------------------

def test_webhook_missing_signature(client):
    """Test webhook returns 400 if stripe-signature header is missing."""
    response = client.post("/api/stripe/webhook", content="{}")
    assert response.status_code == 400
    assert "signature" in response.json()["detail"].lower()


def test_webhook_invalid_signature(client):
    """Test webhook returns 400 if signature verification fails."""
    payload = b'{"type": "checkout.session.completed"}'
    sig_header = "t=123,v1=invalid_signature"
    response = client.post(
        "/api/stripe/webhook",
        content=payload,
        headers={"stripe-signature": sig_header}
    )
    assert response.status_code == 400
    assert "signature" in response.json()["detail"].lower()


def test_webhook_valid_signature(client, mock_stripe):
    """Test webhook processes event with valid signature."""
    # Set up mock to return a specific event
    mock_stripe.Webhook.construct_event.return_value = {
        "type": "checkout.session.completed",
        "data": {"object": {
            "id": "evt_123",
            "metadata": {"user_id": "user_123"},
            "customer": "cus_123",
            "subscription": "sub_123",
        }}
    }

    payload = b'{"type": "checkout.session.completed"}'
    secret = os.environ.get("STRIPE_WEBHOOK_SECRET", "whsec_test_secret")
    sig_header = generate_webhook_signature(payload, secret)

    response = client.post(
        "/api/stripe/webhook",
        content=payload,
        headers={"stripe-signature": sig_header}
    )
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_webhook_unhandled_event_type(client, mock_stripe):
    """Test webhook returns 200 but logs for unhandled event types."""
    mock_stripe.Webhook.construct_event.return_value = {
        "type": "some.other.event",
        "data": {"object": {}}
    }

    payload = b'{"type": "some.other.event"}'
    secret = os.environ.get("STRIPE_WEBHOOK_SECRET", "whsec_test_secret")
    sig_header = generate_webhook_signature(payload, secret)

    response = client.post(
        "/api/stripe/webhook",
        content=payload,
        headers={"stripe-signature": sig_header}
    )
    assert response.status_code == 200


# ---------------------------------------------------------------------------
# Event handler tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_handle_checkout_completed_creates_subscription(
    client, mock_supabase, mock_stripe, monkeypatch
):
    """Test checkout.session.completed creates subscription record."""
    from routes.stripe import _handle_checkout_completed

    session = {
        "id": "sess_123",
        "metadata": {"user_id": "user_123"},
        "customer": "cus_123",
        "subscription": "sub_123",
    }

    await _handle_checkout_completed(session)

    mock_supabase.table.assert_called_once_with("subscriptions")
    mock_supabase.table().upsert.assert_called_once()
    call_args = mock_supabase.table().upsert.call_args[0][0]
    assert call_args["user_id"] == "user_123"
    assert call_args["stripe_customer_id"] == "cus_123"
    assert call_args["stripe_subscription_id"] == "sub_123"
    assert call_args["tier_id"] == "starter"
    assert call_args["status"] == "active"


@pytest.mark.asyncio
async def test_handle_checkout_completed_missing_data(client, mock_supabase, monkeypatch):
    """Test checkout handler returns early if data missing."""
    from routes.stripe import _handle_checkout_completed

    # Missing metadata and subscription
    session = {"metadata": {}}  # No user_id, customer, or subscription
    # Should not raise and should not call supabase
    await _handle_checkout_completed(session)
    mock_supabase.table().upsert.assert_not_called()


@pytest.mark.asyncio
async def test_handle_subscription_updated(client, mock_supabase, monkeypatch):
    """Test customer.subscription.updated updates subscription."""
    from routes.stripe import _handle_subscription_updated

    sub = {
        "id": "sub_123",
        "items": {"data": [{"price": {"id": "price_pro_123"}}]},
        "status": "active",
        "current_period_end": 1234567890,
    }

    await _handle_subscription_updated(sub)

    mock_supabase.table.assert_called_once_with("subscriptions")
    mock_supabase.table().update.assert_called_once()
    mock_supabase.table().eq.assert_called_once_with("stripe_subscription_id", "sub_123")
    call_args = mock_supabase.table().update.call_args[0][0]
    assert call_args["tier_id"] == "pro"
    assert call_args["status"] == "active"


@pytest.mark.asyncio
async def test_handle_subscription_deleted(client, mock_supabase, monkeypatch):
    """Test customer.subscription.deleted downgrades to free."""
    from routes.stripe import _handle_subscription_deleted

    sub = {"id": "sub_123"}

    await _handle_subscription_deleted(sub)

    mock_supabase.table.assert_called_once_with("subscriptions")
    mock_supabase.table().update.assert_called_once()
    call_args = mock_supabase.table().update.call_args[0][0]
    assert call_args["tier_id"] == "free"
    assert call_args["status"] == "cancelled"
    assert call_args["stripe_subscription_id"] is None
    assert call_args["current_period_end"] is None


@pytest.mark.asyncio
async def test_handle_payment_failed(client, mock_supabase, monkeypatch):
    """Test invoice.payment_failed marks subscription as past_due."""
    from routes.stripe import _handle_payment_failed

    invoice = {"subscription": "sub_123"}

    await _handle_payment_failed(invoice)

    mock_supabase.table.assert_called_once_with("subscriptions")
    mock_supabase.table().update.assert_called_once()
    call_args = mock_supabase.table().update.call_args[0][0]
    assert call_args["status"] == "past_due"


@pytest.mark.asyncio
async def test_handle_payment_failed_no_subscription(client, mock_supabase, monkeypatch):
    """Test payment_failed returns early if no subscription ID."""
    from routes.stripe import _handle_payment_failed

    invoice = {}  # No subscription field
    # Should not raise
    await _handle_payment_failed(invoice)
    mock_supabase.table.assert_not_called()


# ---------------------------------------------------------------------------
# Checkout session endpoint tests
# ---------------------------------------------------------------------------

def test_create_checkout_session_success(client, mock_stripe):
    """Test create-checkout-session returns session URL."""
    response = client.post(
        "/api/stripe/create-checkout-session",
        json={"priceId": "price_starter_123", "userId": "user_123"}
    )
    assert response.status_code == 200
    assert response.json()["url"] == "https://checkout.stripe.com/session"

    mock_stripe.checkout.Session.create.assert_called_once()
    call_args = mock_stripe.checkout.Session.create.call_args[1]
    assert call_args["mode"] == "subscription"
    assert call_args["metadata"]["user_id"] == "user_123"
    assert len(call_args["line_items"]) == 1
    assert call_args["line_items"][0]["price"] == "price_starter_123"
    assert call_args["success_url"] == "http://localhost:3000/editor?checkout=success"
    assert call_args["cancel_url"] == "http://localhost:3000/pricing?checkout=cancelled"


def test_create_checkout_session_missing_params(client):
    """Test checkout endpoint returns 400 if params missing."""
    response = client.post("/api/stripe/create-checkout-session", json={})
    assert response.status_code == 400
    assert "priceId" in response.json()["detail"] or "userId" in response.json()["detail"]

    response = client.post("/api/stripe/create-checkout-session", json={"priceId": "p"})
    assert response.status_code == 400


def test_create_checkout_session_stripe_error(client, mock_stripe):
    """Test checkout endpoint handles Stripe API errors."""
    mock_stripe.checkout.Session.create.side_effect = Exception("Stripe error")

    response = client.post(
        "/api/stripe/create-checkout-session",
        json={"priceId": "price_starter_123", "userId": "user_123"}
    )
    assert response.status_code == 500


# ---------------------------------------------------------------------------
# Portal session endpoint tests
# ---------------------------------------------------------------------------

def test_create_portal_session_success(client, mock_stripe):
    """Test create-portal-session returns session URL."""
    response = client.post(
        "/api/stripe/create-portal-session",
        json={"stripeCustomerId": "cus_123"}
    )
    assert response.status_code == 200
    assert response.json()["url"] == "https://billing.stripe.com/session"

    mock_stripe.billing_portal.Session.create.assert_called_once()
    call_args = mock_stripe.billing_portal.Session.create.call_args[1]
    assert call_args["customer"] == "cus_123"
    assert call_args["return_url"] == "http://localhost:3000/editor"


def test_create_portal_session_missing_customer(client):
    """Test portal endpoint returns 400 if customer ID missing."""
    response = client.post("/api/stripe/create-portal-session", json={})
    assert response.status_code == 400
    assert "stripeCustomerId" in response.json()["detail"]


def test_create_portal_session_stripe_error(client, mock_stripe):
    """Test portal endpoint handles Stripe API errors."""
    mock_stripe.billing_portal.Session.create.side_effect = Exception("Stripe error")

    response = client.post(
        "/api/stripe/create-portal-session",
        json={"stripeCustomerId": "cus_123"}
    )
    assert response.status_code == 500


# ---------------------------------------------------------------------------
# Price to tier mapping tests
# ---------------------------------------------------------------------------

def test_price_to_tier_mapping(client, monkeypatch):
    """Test PRICE_TO_TIER mapping uses environment variables."""
    monkeypatch.setenv("STRIPE_STARTER_PRICE_ID", "price_starter_abc")
    monkeypatch.setenv("STRIPE_PRO_PRICE_ID", "price_pro_xyz")

    # Reload module to pick up new env vars
    import importlib
    import routes.stripe as stripe_module
    importlib.reload(stripe_module)

    assert stripe_module.PRICE_TO_TIER["price_starter_abc"] == "starter"
    assert stripe_module.PRICE_TO_TIER["price_pro_xyz"] == "pro"
    assert stripe_module.PRICE_TO_TIER.get("unknown_price", "free") == "free"
