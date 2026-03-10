"""Tests for allowed_actions validation, estimation impact, and scaffold awareness."""

import pytest
from pydantic import ValidationError

from models import NodeConfig
from estimator import estimate_agent_node


# ── Validation tests ─────────────────────────────────────────────


class TestAllowedActionsValidation:
    """Tests for NodeConfig allowed_actions field validation."""

    def test_accepts_valid_allowed_actions_list(self):
        """NodeConfig accepts a valid allowed_actions list."""
        node = NodeConfig(
            id="agent-1",
            type="agentNode",
            allowed_actions=["approve", "reject", "escalate"],
        )
        assert node.allowed_actions == ["approve", "reject", "escalate"]

    def test_accepts_allowed_actions_none(self):
        """NodeConfig accepts allowed_actions=None (default)."""
        node = NodeConfig(id="agent-1", type="agentNode")
        assert node.allowed_actions is None

    def test_rejects_empty_string_item(self):
        """NodeConfig rejects empty string in allowed_actions."""
        with pytest.raises(ValidationError, match="empty"):
            NodeConfig(
                id="agent-1",
                type="agentNode",
                allowed_actions=["approve", "", "reject"],
            )

    def test_rejects_more_than_20_items(self):
        """NodeConfig rejects allowed_actions with >20 items."""
        actions = [f"action-{i}" for i in range(21)]
        with pytest.raises(ValidationError, match="20"):
            NodeConfig(
                id="agent-1",
                type="agentNode",
                allowed_actions=actions,
            )

    def test_rejects_item_over_50_chars(self):
        """NodeConfig rejects action label longer than 50 characters."""
        long_label = "a" * 51
        with pytest.raises(ValidationError, match="50"):
            NodeConfig(
                id="agent-1",
                type="agentNode",
                allowed_actions=[long_label],
            )

    def test_strips_whitespace_from_items(self):
        """NodeConfig strips leading/trailing whitespace from action labels."""
        node = NodeConfig(
            id="agent-1",
            type="agentNode",
            allowed_actions=["  approve  ", " reject ", "escalate"],
        )
        assert node.allowed_actions == ["approve", "reject", "escalate"]


# ── Estimation impact tests ──────────────────────────────────────


class TestAllowedActionsEstimation:
    """Tests for estimation impact of allowed_actions on agent nodes."""

    def _make_agent(self, task_type: str, allowed_actions=None):
        """Helper to create an agent NodeConfig."""
        return NodeConfig(
            id="agent-1",
            type="agentNode",
            label="Test Agent",
            model_provider="OpenAI",
            model_name="GPT-4o",
            context="Classify the incoming ticket",
            task_type=task_type,
            expected_output_size="short",
            allowed_actions=allowed_actions,
        )

    def test_classification_with_actions_fewer_output_tokens(self):
        """Classification + allowed_actions produces fewer output_tokens than without."""
        without = estimate_agent_node(
            self._make_agent("classification"), []
        )
        with_actions = estimate_agent_node(
            self._make_agent("classification", ["positive", "negative", "neutral"]), []
        )
        assert with_actions.output_tokens < without.output_tokens

    def test_routing_with_actions_fewer_output_tokens(self):
        """Routing + allowed_actions produces fewer output_tokens than without."""
        without = estimate_agent_node(
            self._make_agent("routing"), []
        )
        with_actions = estimate_agent_node(
            self._make_agent("routing", ["escalate", "auto-resolve", "request-info"]), []
        )
        assert with_actions.output_tokens < without.output_tokens

    def test_summarization_with_actions_unchanged_output_tokens(self):
        """Summarization + allowed_actions does NOT change output_tokens."""
        without = estimate_agent_node(
            self._make_agent("summarization"), []
        )
        with_actions = estimate_agent_node(
            self._make_agent("summarization", ["short", "detailed", "bullet-points"]), []
        )
        assert with_actions.output_tokens == without.output_tokens

    def test_classification_with_actions_adds_input_tokens(self):
        """Classification + allowed_actions adds action label tokens to input_tokens."""
        without = estimate_agent_node(
            self._make_agent("classification"), []
        )
        with_actions = estimate_agent_node(
            self._make_agent("classification", ["positive", "negative", "neutral"]), []
        )
        assert with_actions.input_tokens > without.input_tokens


# ── Scaffold awareness tests ─────────────────────────────────────


class TestScaffoldActionAwareness:
    """Tests for scaffold generator action awareness (ACTN-06)."""

    def test_scaffold_prompt_mentions_allowed_actions(self):
        """SCAFFOLD_SYSTEM_PROMPT contains 'allowed_actions'."""
        from scaffold_generator import SCAFFOLD_SYSTEM_PROMPT
        assert "allowed_actions" in SCAFFOLD_SYSTEM_PROMPT

    def test_scaffold_prompt_has_action_population_rule(self):
        """SCAFFOLD_SYSTEM_PROMPT has a rule about populating allowed_actions."""
        from scaffold_generator import SCAFFOLD_SYSTEM_PROMPT
        assert "action" in SCAFFOLD_SYSTEM_PROMPT.lower()
        assert any(
            word in SCAFFOLD_SYSTEM_PROMPT.lower()
            for word in ["populate", "include", "set"]
        )

    def test_fallback_workflow_no_allowed_actions(self):
        """Fallback workflow does NOT include allowed_actions field."""
        from scaffold_generator import _fallback_workflow
        result = _fallback_workflow("test prompt")
        for node in result["nodes"]:
            assert "allowed_actions" not in node or node.get("allowed_actions") is None
