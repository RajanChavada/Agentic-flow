"use client";

import Link from "next/link";
import {
    ArrowRight,
    ExternalLink,
    AlertTriangle,
    Layers,
    Rocket,
} from "lucide-react";

/* ── Provider links ──────────────────────────────────────── */
const providers = [
    { name: "OpenAI", url: "https://openai.com/api/pricing/", models: "GPT-4, GPT-4o, GPT-4o mini, o3, o4 mini + more" },
    { name: "Anthropic", url: "https://www.anthropic.com/pricing", models: "Claude 3.5 Sonnet/Haiku, Claude 3 Opus, Claude 3.7 Sonnet + more" },
    { name: "Google", url: "https://ai.google.dev/pricing", models: "Gemini 1.5 Pro/Flash, Gemini 2.0 Pro/Flash, Gemini Exp-1206 + more" },
    { name: "Meta", url: "https://ai.meta.com/llama/", models: "Llama 3.1 (405B/70B/8B), Llama 3.2, Llama 3.3" },
    { name: "Mistral", url: "https://mistral.ai/products/", models: "Mistral Large/Medium/Small, Codestral" },
    { name: "DeepSeek", url: "https://platform.deepseek.com/", models: "DeepSeek-V3, DeepSeek-R1" },
    { name: "Cohere", url: "https://cohere.com/pricing", models: "Command R, Command R+, Command Nightly" },
];

export default function PricingPage() {
    return (
        <article>
            {/* ── Header ───────────────────────────────────────── */}
            <header className="mb-12">

                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                    Pricing & Latency
                </h1>
                <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
                    How Neurovn estimates cost and latency for every node in your
                    workflow. All numbers are computed locally — zero external API calls.
                </p>
            </header>

            {/* ── How pricing works ────────────────────────────── */}
            <section className="mb-14">
                <h2 className="mb-4 text-xl font-semibold tracking-tight">
                    How pricing works
                </h2>
                <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
                    <p>
                        Neurovn maintains a local <strong>pricing registry</strong> — a
                        JSON file with per-model rates for 50+ models across 7 providers.
                        When you assign a model to an Agent node, the estimator looks up
                        that model&apos;s input and output token rates.
                    </p>
                    <p>
                        Actual pricing is set by each provider and can change at any time.
                        Neurovn&apos;s registry is updated regularly, but for
                        production-critical budgets, always verify against the
                        provider&apos;s official pricing page.
                    </p>
                </div>

                {/* Provider notice */}
                <div className="mt-4 flex items-start gap-3 rounded-xl border border-yellow-500/30 bg-yellow-500/5 px-5 py-4">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-600 dark:text-yellow-400" />
                    <p className="text-sm leading-relaxed text-muted-foreground">
                        Providers can change prices without notice. Neurovn estimates are
                        approximations for planning — always confirm sensitive budgets
                        against official rate cards.
                    </p>
                </div>
            </section>

            {/* ── Cost formulas ────────────────────────────────── */}
            <section className="mb-14">
                <h2 className="mb-4 text-xl font-semibold tracking-tight">
                    Cost formulas
                </h2>

                <div className="space-y-4">
                    {/* LLM node */}
                    <div className="rounded-xl border border-border bg-card/50 p-5">
                        <h3 className="mb-2 text-sm font-semibold">LLM (Agent) Node</h3>
                        <div className="rounded-lg bg-secondary/40 px-4 py-3">
                            <code className="text-xs font-mono text-foreground leading-relaxed block">
                                input_cost   = (input_tokens  / 1,000,000) × model.input_per_million{"\n"}
                                output_cost  = (output_tokens / 1,000,000) × model.output_per_million{"\n"}
                                node_cost    = input_cost + output_cost
                            </code>
                        </div>
                        <p className="mt-3 text-sm text-muted-foreground">
                            Input tokens are counted from the system prompt + context using
                            native tokenization. Output tokens are estimated via a task-type multiplier.
                        </p>
                    </div>

                    {/* Tool node */}
                    <div className="rounded-xl border border-border bg-card/50 p-5">
                        <h3 className="mb-2 text-sm font-semibold">Tool Node</h3>
                        <div className="rounded-lg bg-secondary/40 px-4 py-3">
                            <code className="text-xs font-mono text-foreground leading-relaxed block">
                                tool_overhead = +200 schema tokens (input) + 1600 response tokens (output){"\n"}
                                tool_cost     = per-call fee or fixed overhead (if applicable)
                            </code>
                        </div>
                    </div>

                    {/* Workflow total */}
                    <div className="rounded-xl border border-border bg-card/50 p-5">
                        <h3 className="mb-2 text-sm font-semibold">Workflow Total</h3>
                        <div className="rounded-lg bg-secondary/40 px-4 py-3">
                            <code className="text-xs font-mono text-foreground leading-relaxed block">
                                workflow_cost = SUM(node_costs){"\n"}
                                + branch_probabilities × branch_costs{"\n"}
                                + loop_iterations × loop_body_costs
                            </code>
                        </div>
                        <p className="mt-3 text-sm text-muted-foreground">
                            For branched workflows, each path&apos;s cost is weighted by its
                            probability. For loops, cost scales by expected iterations (with
                            a configurable max).
                        </p>
                    </div>
                </div>
            </section>

            {/* ── Latency model ────────────────────────────────── */}
            <section className="mb-14">
                <h2 className="mb-4 text-xl font-semibold tracking-tight">
                    Latency model
                </h2>

                <div className="space-y-4">
                    <div className="rounded-xl border border-border bg-card/50 p-5">
                        <h3 className="mb-2 text-sm font-semibold">Per-Node Latency</h3>
                        <div className="rounded-lg bg-secondary/40 px-4 py-3">
                            <code className="text-xs font-mono text-foreground leading-relaxed block">
                                agent_latency = (output_tokens / model.tokens_per_sec) × 1000 ms{"\n"}
                                tool_latency  = ~400 ms per invocation (network round-trip)
                            </code>
                        </div>
                    </div>

                    <div className="rounded-xl border border-border bg-card/50 p-5">
                        <h3 className="mb-2 text-sm font-semibold">Graph Latency</h3>
                        <div className="rounded-lg bg-secondary/40 px-4 py-3">
                            <code className="text-xs font-mono text-foreground leading-relaxed block">
                                sequential  = SUM(node_latencies)      along the path{"\n"}
                                parallel    = MAX(branch_latencies)     across branches{"\n"}
                                loop/retry  = expected_iterations × single_lap_latency
                            </code>
                        </div>
                        <p className="mt-3 text-sm text-muted-foreground">
                            The <strong>critical path</strong> — the longest-latency path
                            through the graph — determines the end-to-end P95 latency
                            estimate.
                        </p>
                    </div>
                </div>
            </section>

            {/* ── Supported providers ──────────────────────────── */}
            <section className="mb-14">
                <h2 className="mb-4 text-xl font-semibold tracking-tight">
                    Supported providers
                </h2>
                <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
                    Neurovn ships with pricing data for 38+ models. Adding a new model
                    is a single entry in{" "}
                    <code className="rounded bg-secondary px-1.5 py-0.5 text-xs font-mono">
                        backend/data/model_pricing.json
                    </code>{" "}
                    — no code changes needed.
                </p>
                <div className="overflow-hidden rounded-xl border border-border">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border bg-secondary/40">
                                <th className="px-4 py-3 text-left font-semibold">Provider</th>
                                <th className="px-4 py-3 text-left font-semibold">Models</th>
                                <th className="px-4 py-3 text-right font-semibold">Pricing</th>
                            </tr>
                        </thead>
                        <tbody>
                            {providers.map((p) => (
                                <tr
                                    key={p.name}
                                    className="border-b border-border/60 last:border-0"
                                >
                                    <td className="px-4 py-3 font-medium">{p.name}</td>
                                    <td className="px-4 py-3 text-muted-foreground">{p.models}</td>
                                    <td className="px-4 py-3 text-right">
                                        <a
                                            href={p.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 text-muted-foreground transition hover:text-foreground"
                                        >
                                            Official
                                            <ExternalLink className="h-3 w-3" />
                                        </a>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* ── Next steps ───────────────────────────────────── */}
            <section>
                <h2 className="mb-4 text-xl font-semibold tracking-tight">
                    Next up
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                    <Link
                        href="/docs/nodes"
                        className="group flex items-center justify-between rounded-xl border border-border bg-card px-5 py-4 transition hover:border-border/80 hover:shadow-sm"
                    >
                        <div className="flex items-center gap-3">
                            <Layers className="h-4 w-4 text-muted-foreground" />
                            <div>
                                <p className="text-sm font-semibold">Node Palette</p>
                                <p className="text-xs text-muted-foreground">
                                    All node types explained
                                </p>
                            </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </Link>
                    <Link
                        href="/docs/quickstart"
                        className="group flex items-center justify-between rounded-xl border border-border bg-card px-5 py-4 transition hover:border-border/80 hover:shadow-sm"
                    >
                        <div className="flex items-center gap-3">
                            <Rocket className="h-4 w-4 text-muted-foreground" />
                            <div>
                                <p className="text-sm font-semibold">Quickstart</p>
                                <p className="text-xs text-muted-foreground">
                                    Build your first workflow
                                </p>
                            </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </Link>
                </div>
            </section>
        </article>
    );
}
