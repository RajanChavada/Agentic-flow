"""Security tests for rate limiting, error sanitization, and structured logging.

These tests serve as acceptance criteria for the Security Guardrails & Production
Hardening feature. They validate behavior described in:
  Context/features/security-guardrails-production-hardening.md

Tests are grouped into:
  1. Rate Limiting (slowapi) -- verifies per-endpoint limits and 429 responses
     (marked xfail until slowapi is integrated)
  2. Error Sanitization -- verifies error message patterns
  3. Structured Logging -- verifies request logging middleware
  4. Config defaults -- verifies environment variable defaults
"""

import pytest
from fastapi.testclient import TestClient


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture()
def client():
    """Fresh TestClient for each test."""
    from main import app
    return TestClient(app)


@pytest.fixture()
def minimal_estimate_payload():
    """Minimal valid payload for POST /api/estimate."""
    return {
        "nodes": [
            {
                "id": "start-1",
                "type": "startNode",
                "label": "Start",
                "model_provider": None,
                "model_name": None,
                "context": None,
                "tool_id": None,
                "tool_category": None,
                "max_steps": None,
                "task_type": None,
                "expected_output_size": None,
                "expected_calls_per_run": None,
            }
        ],
        "edges": [],
        "runs_per_day": None,
        "loop_intensity": 1.0,
    }


@pytest.fixture()
def minimal_batch_payload():
    """Minimal valid payload for POST /api/estimate/batch."""
    return {
        "workflows": [
            {
                "id": "wf-1",
                "name": "Test",
                "nodes": [
                    {
                        "id": "start-1",
                        "type": "startNode",
                        "label": "Start",
                        "model_provider": None,
                        "model_name": None,
                        "context": None,
                        "tool_id": None,
                        "tool_category": None,
                        "max_steps": None,
                        "task_type": None,
                        "expected_output_size": None,
                        "expected_calls_per_run": None,
                    }
                ],
                "edges": [],
            }
        ],
    }


# ═══════════════════════════════════════════════════════════════════════════
# 1. Rate Limiting (slowapi)
#    These tests will pass after slowapi is integrated per the feature spec.
# ═══════════════════════════════════════════════════════════════════════════


class TestRateLimiting:
    """Rate limiting via slowapi -- xfail until feature is implemented."""

    @pytest.mark.xfail(reason="slowapi not yet integrated", strict=False)
    def test_estimate_rate_limit_headers_present(self, client, minimal_estimate_payload):
        """Response should include X-RateLimit-Limit and X-RateLimit-Remaining headers."""
        resp = client.post("/api/estimate", json=minimal_estimate_payload)
        assert resp.status_code == 200
        header_keys = [k.lower() for k in resp.headers.keys()]
        assert "x-ratelimit-limit" in header_keys, (
            "Missing rate limit headers -- slowapi not integrated"
        )

    @pytest.mark.xfail(reason="slowapi not yet integrated", strict=False)
    def test_estimate_rate_limit_enforced(self, client, minimal_estimate_payload):
        """31st request within window should return HTTP 429."""
        for i in range(30):
            resp = client.post("/api/estimate", json=minimal_estimate_payload)
            assert resp.status_code == 200, f"Request {i+1} failed unexpectedly"

        resp = client.post("/api/estimate", json=minimal_estimate_payload)
        assert resp.status_code == 429, (
            f"Expected 429 on request 31, got {resp.status_code}"
        )

    @pytest.mark.xfail(reason="slowapi not yet integrated", strict=False)
    def test_rate_limit_429_returns_json_error(self, client, minimal_estimate_payload):
        """429 response should have JSON body with error message."""
        for _ in range(31):
            client.post("/api/estimate", json=minimal_estimate_payload)

        resp = client.post("/api/estimate", json=minimal_estimate_payload)
        assert resp.status_code == 429
        data = resp.json()
        assert "error" in data or "detail" in data

    def test_health_endpoint_not_rate_limited_at_60(self, client):
        """Health endpoint should allow at least 60 requests without limit."""
        for i in range(60):
            resp = client.get("/health")
            assert resp.status_code == 200, (
                f"Health request {i+1} was unexpectedly blocked"
            )

    @pytest.mark.xfail(reason="slowapi not yet integrated", strict=False)
    def test_batch_estimate_rate_limit_stricter(self, client, minimal_batch_payload):
        """Batch endpoint should be limited to 10/min (stricter than single estimate)."""
        for i in range(10):
            resp = client.post("/api/estimate/batch", json=minimal_batch_payload)
            assert resp.status_code == 200, f"Batch request {i+1} failed with {resp.status_code}"

        resp = client.post("/api/estimate/batch", json=minimal_batch_payload)
        assert resp.status_code == 429, (
            f"Expected 429 on batch request 11, got {resp.status_code}"
        )


# ═══════════════════════════════════════════════════════════════════════════
# 2. Error Sanitization
# ═══════════════════════════════════════════════════════════════════════════


class TestErrorSanitization:
    """Error responses should not leak internal details."""

    def test_validation_error_returns_422(self, client):
        """Invalid request body should return 422."""
        resp = client.post("/api/estimate", json={"invalid": "payload"})
        assert resp.status_code == 422

    def test_import_workflow_error_detail_pattern(self, client):
        """Import failures currently include detail string.
        After sanitization, production mode should return generic message."""
        resp = client.post("/api/import-workflow", json={
            "source": "langgraph",
            "payload": "not-a-dict",
        })
        # Currently expected to fail at validation or adapter level
        assert resp.status_code in (400, 422)
        data = resp.json()
        assert "detail" in data

    def test_error_response_no_traceback(self, client):
        """No error response should contain Python tracebacks."""
        # Send invalid payloads to multiple endpoints
        bad_payloads = [
            ("POST", "/api/estimate", {"nodes": "invalid"}),
            ("POST", "/api/estimate/batch", {"workflows": "invalid"}),
        ]
        for method, path, payload in bad_payloads:
            resp = client.post(path, json=payload) if method == "POST" else client.get(path)
            if resp.status_code >= 400:
                body = resp.text
                assert "Traceback" not in body, (
                    f"{method} {path} leaks traceback in error response"
                )
                assert "File \"" not in body, (
                    f"{method} {path} leaks file paths in error response"
                )

    def test_404_model_returns_error_response(self, client):
        """Looking up a nonexistent model should return 404 with detail."""
        resp = client.get("/api/models/FakeProvider/nonexistent-model")
        assert resp.status_code == 404
        data = resp.json()
        assert "detail" in data

    def test_404_tool_returns_error_response(self, client):
        """Looking up a nonexistent tool should return 404 with detail."""
        resp = client.get("/api/tools/nonexistent-tool-xyz")
        assert resp.status_code == 404
        data = resp.json()
        assert "detail" in data


# ═══════════════════════════════════════════════════════════════════════════
# 3. Structured Logging
# ═══════════════════════════════════════════════════════════════════════════


class TestStructuredLogging:
    """Structured logging via structlog middleware."""

    def test_request_completes_with_logging_middleware(self, client):
        """Request logging middleware (when present) should not break responses."""
        resp = client.get("/health")
        assert resp.status_code == 200
        assert resp.json() == {"status": "ok"}

    def test_request_with_custom_request_id(self, client):
        """X-Request-ID header should not cause errors."""
        resp = client.get("/health", headers={"X-Request-ID": "test-req-123"})
        assert resp.status_code == 200

    def test_estimate_with_request_id(self, client, minimal_estimate_payload):
        """POST /api/estimate should work with X-Request-ID header."""
        resp = client.post(
            "/api/estimate",
            json=minimal_estimate_payload,
            headers={"X-Request-ID": "est-req-456"},
        )
        assert resp.status_code == 200


# ═══════════════════════════════════════════════════════════════════════════
# 4. Config Defaults
# ═══════════════════════════════════════════════════════════════════════════


class TestConfigDefaults:
    """Environment variable defaults in config.py."""

    def test_frontend_origins_default(self):
        """FRONTEND_ORIGINS should default to localhost:3000."""
        from config import FRONTEND_ORIGINS
        assert "http://localhost:3000" in FRONTEND_ORIGINS

    def test_host_default(self):
        """HOST should default to 0.0.0.0."""
        from config import HOST
        assert HOST == "0.0.0.0"

    def test_port_default(self):
        """PORT should default to 8000."""
        from config import PORT
        assert PORT == 8000


# ═══════════════════════════════════════════════════════════════════════════
# 5. CORS Configuration
# ═══════════════════════════════════════════════════════════════════════════


class TestCORSConfiguration:
    """CORS middleware should be properly configured."""

    def test_cors_allows_frontend_origin(self, client):
        """CORS should allow requests from frontend origin."""
        resp = client.options(
            "/api/estimate",
            headers={
                "Origin": "http://localhost:3000",
                "Access-Control-Request-Method": "POST",
            },
        )
        assert resp.status_code == 200

    def test_cors_blocks_unknown_origin(self, client):
        """CORS should not include allow-origin header for unknown origins."""
        resp = client.options(
            "/api/estimate",
            headers={
                "Origin": "https://malicious-site.com",
                "Access-Control-Request-Method": "POST",
            },
        )
        allow_origin = resp.headers.get("access-control-allow-origin", "")
        assert allow_origin != "https://malicious-site.com", (
            "CORS allows requests from unknown origin"
        )
