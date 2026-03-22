"""Unit tests for the LangGraph transpiler."""

from __future__ import annotations

import ast
import sys
import os

# Ensure backend root is importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
from transpiler.langgraph_exporter import (
    label_to_identifier,
    resolve_provider_imports,
    generate_full_file,
    build_node_map,
)


# ── label_to_identifier ────────────────────────────────────────────────────────

class TestLabelToIdentifier:
    def test_normal_string(self):
        assert label_to_identifier("My Agent") == "my_agent"

    def test_spaces_become_underscores(self):
        assert label_to_identifier("GPT-4o Node") == "gpt_4o_node"

    def test_leading_digit_prefixed(self):
        result = label_to_identifier("1st Agent")
        assert result.startswith("node_") or not result[0].isdigit()

    def test_special_chars_removed(self):
        result = label_to_identifier("Agent!@#$%^&*()")
        assert re.search(r"[^\w]", result) is None or "_" in result

    def test_empty_string_returns_unnamed(self):
        assert label_to_identifier("") == "unnamed_node"
        assert label_to_identifier("   ") == "unnamed_node"

    def test_already_valid(self):
        result = label_to_identifier("valid_name")
        assert result == "valid_name"

    def test_consecutive_underscores_collapsed(self):
        result = label_to_identifier("A  B   C")
        assert "__" not in result

    def test_all_special_chars(self):
        result = label_to_identifier("!!! @@@")
        assert result == "unnamed_node"

    def test_python_keyword(self):
        result = label_to_identifier("for")
        assert result != "for"
        assert result.isidentifier()

    def test_truncated_to_64(self):
        long = "a" * 100
        assert len(label_to_identifier(long)) <= 64

    def test_hyphens_become_underscores(self):
        assert label_to_identifier("claude-3-5-sonnet") == "claude_3_5_sonnet"

    def test_mixed_case_lowercased(self):
        result = label_to_identifier("MyAgent")
        assert result == result.lower()

    def test_leading_underscore_stripped(self):
        result = label_to_identifier("_underscore_start")
        # Should not start with underscore after strip
        assert not result.startswith("_")


# ── resolve_provider_imports ───────────────────────────────────────────────────

import re  # noqa: E402 — placed after tests defined above for clarity

class TestResolveProviderImports:
    def _node_map(self, *providers):
        return {
            f"node-{i}": {"id": f"node-{i}", "type": "agentNode", "model_provider": p, "model_name": "test"}
            for i, p in enumerate(providers)
        }

    def test_openai_only(self):
        result = resolve_provider_imports(self._node_map("OpenAI"))
        assert len(result) == 1
        assert "ChatOpenAI" in result[0]
        assert "langchain_openai" in result[0]

    def test_anthropic_only(self):
        result = resolve_provider_imports(self._node_map("Anthropic"))
        assert len(result) == 1
        assert "ChatAnthropic" in result[0]

    def test_mixed_openai_anthropic(self):
        result = resolve_provider_imports(self._node_map("OpenAI", "Anthropic"))
        assert len(result) == 2
        providers_in_result = " ".join(result)
        assert "ChatOpenAI" in providers_in_result
        assert "ChatAnthropic" in providers_in_result

    def test_deduplication(self):
        # Two OpenAI nodes — only one import
        result = resolve_provider_imports(self._node_map("OpenAI", "OpenAI"))
        assert len(result) == 1

    def test_no_providers(self):
        node_map = {"start": {"id": "start", "type": "startNode"}}
        result = resolve_provider_imports(node_map)
        assert result == []

    def test_google_included(self):
        result = resolve_provider_imports(self._node_map("Google"))
        assert len(result) == 1
        assert "ChatGoogleGenerativeAI" in result[0]

    def test_unknown_provider_excluded(self):
        result = resolve_provider_imports(self._node_map("SomeUnknownProvider"))
        assert result == []

    def test_case_insensitive_provider(self):
        result = resolve_provider_imports(self._node_map("OPENAI"))
        assert len(result) == 1
        assert "ChatOpenAI" in result[0]


# ── generate_full_file — Multi-Model Comparison acceptance test ───────────────

MULTI_MODEL_COMPARISON_WORKFLOW = {
    "name": "Multi-Model Comparison",
    "nodes": [
        {"id": "start-1", "type": "startNode", "label": "Start"},
        {
            "id": "agent-gpt",
            "type": "agentNode",
            "label": "GPT-4o Node",
            "model_provider": "OpenAI",
            "model_name": "gpt-4o",
            "context": "Analyze this input with GPT-4o",
        },
        {
            "id": "agent-claude",
            "type": "agentNode",
            "label": "Claude 3.5",
            "model_provider": "Anthropic",
            "model_name": "claude-3-5-sonnet-20241022",
            "context": "Analyze this input with Claude",
        },
        {
            "id": "agent-aggregator",
            "type": "agentNode",
            "label": "Aggregator",
            "model_provider": "OpenAI",
            "model_name": "gpt-4o-mini",
            "context": "Aggregate results",
        },
        {"id": "finish-1", "type": "finishNode", "label": "Finish"},
    ],
    "edges": [
        {"id": "e1", "source": "start-1", "target": "agent-gpt"},
        {"id": "e2", "source": "start-1", "target": "agent-claude"},  # parallel fork
        {"id": "e3", "source": "agent-gpt", "target": "agent-aggregator"},
        {"id": "e4", "source": "agent-claude", "target": "agent-aggregator"},
        {"id": "e5", "source": "agent-aggregator", "target": "finish-1"},
    ],
}


class TestMultiModelComparisonWorkflow:
    def test_output_is_syntactically_valid_python(self):
        result = generate_full_file(MULTI_MODEL_COMPARISON_WORKFLOW)
        try:
            ast.parse(result)
        except SyntaxError as e:
            pytest.fail(f"Generated code has syntax error: {e}\n\nGenerated code:\n{result}")

    def test_contains_state_graph(self):
        result = generate_full_file(MULTI_MODEL_COMPARISON_WORKFLOW)
        assert "StateGraph" in result

    def test_contains_chat_anthropic(self):
        result = generate_full_file(MULTI_MODEL_COMPARISON_WORKFLOW)
        assert "ChatAnthropic" in result

    def test_contains_chat_openai(self):
        result = generate_full_file(MULTI_MODEL_COMPARISON_WORKFLOW)
        assert "ChatOpenAI" in result

    def test_has_three_async_functions(self):
        result = generate_full_file(MULTI_MODEL_COMPARISON_WORKFLOW)
        count = result.count("async def ")
        assert count >= 3, f"Expected >= 3 async def functions, got {count}"

    def test_has_at_least_three_add_node(self):
        result = generate_full_file(MULTI_MODEL_COMPARISON_WORKFLOW)
        count = result.count("graph.add_node")
        assert count >= 3, f"Expected >= 3 graph.add_node calls, got {count}"

    def test_has_add_edge_calls(self):
        result = generate_full_file(MULTI_MODEL_COMPARISON_WORKFLOW)
        count = result.count("graph.add_edge")
        assert count >= 1, "Expected at least one graph.add_edge call"

    def test_has_parallel_fork_comment(self):
        result = generate_full_file(MULTI_MODEL_COMPARISON_WORKFLOW)
        assert "Parallel fork" in result, "Expected '# ── Parallel fork' comment block"

    def test_with_estimation_report_fills_header(self):
        estimation = {
            "best_case_cost": 0.00123,
            "worst_case_cost": 0.00456,
            "critical_path_latency": 1.234,
            "total_latency": 1.5,
        }
        result = generate_full_file(MULTI_MODEL_COMPARISON_WORKFLOW, estimation)
        assert "0.00123" in result
        assert "0.00456" in result
        assert "1234ms" in result  # 1.234s → 1234ms

    def test_without_estimation_uses_placeholder(self):
        result = generate_full_file(MULTI_MODEL_COMPARISON_WORKFLOW, None)
        assert "run estimation first" in result.lower()

    def test_end_symbol_present(self):
        result = generate_full_file(MULTI_MODEL_COMPARISON_WORKFLOW)
        assert "END" in result

    def test_app_compile_present(self):
        result = generate_full_file(MULTI_MODEL_COMPARISON_WORKFLOW)
        assert "app = graph.compile()" in result

    def test_no_duplicate_provider_imports(self):
        # OpenAI appears twice (gpt-4o and gpt-4o-mini) — should only import once
        result = generate_full_file(MULTI_MODEL_COMPARISON_WORKFLOW)
        openai_import_count = result.count("from langchain_openai import ChatOpenAI")
        assert openai_import_count == 1, f"Duplicate OpenAI imports: {openai_import_count}"
