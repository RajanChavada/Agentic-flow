---
name: orchestration
description: Orchestrates agent tasks by extracting programmer intent, mapping to the correct rules/skills, and loading the right context files—without requiring @ mentions. Use whenever the user describes a task, feature, bug, or change in natural language. The agent parses intent, selects applicable rules from Context/, .ai/context/, and .cursor/rules/, then applies them. Also use when the user asks to "plan", "implement", "fix", "add", "create", or describes work in conversational terms.
---

# Orchestration Tool Call

A higher-level workflow that extracts the programmer's query, maps it to the right rules and context, and applies changes—so the programmer does not need to manually @ mention files or rules.

## Step 1 — Extract Intent

Before doing anything, parse the user's message and extract:

| Field | What to capture |
|-------|-----------------|
| **Primary intent** | What does the user want? (feature, bug fix, refactor, new node type, roadmap, etc.) |
| **Domain** | Frontend, backend, database, full-stack, or mixed? |
| **Key entities** | Files, components, endpoints, tables, or concepts mentioned |
| **Constraints** | "Don't touch X", "follow Y pattern", "use Z library" |
| **Output expectations** | New file, edit existing, create feature doc, run migration, etc. |

Write a brief intent summary (2–4 lines) before proceeding. This anchors all subsequent steps.

**Example:**
> User: "Add a home button so people can get back to their canvases from the editor"
> Intent: Feature — add navigation affordance. Domain: frontend. Entity: HeaderBar, /canvases. Output: edit HeaderBar.tsx, add Link/button.

## Step 2 — Map Intent to Rules and Context

Use the [Rule Registry](references/rule-registry.md) to select which rules and files apply. The registry maps intent patterns to:

- **Cursor rules** (`.cursor/rules/*.mdc`) — when to apply each rule
- **Context docs** (`Context/`) — CONTEXT.md, FEATURE_ROADMAP.md, FRONTEND_PLAN.MD, BACKEND_PLAN.md
- **Feature files** (`Context/features/`, `.ai/context/features/`) — structured specs for implementation
- **Memory** (`Context/memory/`) — AGENT_MEMORY.md, logs_agent/, task_plan.md

**Selection logic:**
- Feature / roadmap / plan → `feature-roadmap`, `Context/CONTEXT.md`, `Context/FEATURE_ROADMAP.md`
- Bug fix → `bug-fix`, `Context/memory/AGENT_MEMORY.md`, `Context/memory/logs_agent/`
- Frontend edit → `frontend-impl`, `Context/FRONTEND_PLAN.MD`, relevant feature file
- Backend edit → `backend-impl`, `Context/BACKEND_PLAN.md`
- New node type → `new-node-type`
- Database / Supabase → `supabase-db`
- After any task → `log-update`
- UX / lovability → `min-lovable-product`
- Testing / QA → `qa-agent` (skill)

## Step 3 — Load Context Proactively

**You must read the selected files into context** before making changes. Do not assume they are already loaded. Use the Read tool to load:

1. **Always** (if applicable): The rule file(s) from `.cursor/rules/` that match the intent
2. **Context docs**: `Context/CONTEXT.md`, `Context/FRONTEND_PLAN.MD`, `Context/BACKEND_PLAN.md` as needed
3. **Feature file**: If a feature exists for this task, read `Context/features/[name].md` or `.ai/context/features/[name].md`
4. **Memory**: `Context/memory/AGENT_MEMORY.md` for bugs/decisions; `Context/memory/logs_agent/` for recent changes

Explicitly list which files you are loading and why, then read them.

## Step 4 — Apply Rules and Execute

1. Follow the instructions in each loaded rule exactly
2. If a rule says "read X before Y", do it in that order
3. If a rule says "create a feature file first", create it before implementation
4. If a rule says "append to logs", do it after the task

Execute the task according to the rule workflows. Do not skip mandatory steps (e.g. `task_plan.md` before frontend edits, root-cause analysis before bug fixes).

## Step 5 — Ensure Correct Files in Context

If the user's intent involves specific source files (e.g. `HeaderBar.tsx`, `useWorkflowStore.ts`), **read those files** into context before editing. The orchestration skill does not auto-inject files—you must explicitly load:

- Components, hooks, stores, or pages mentioned or implied by the intent
- Any file referenced in a feature spec or rule

After loading, proceed with edits.

---

## Quick Reference: Intent → Rule Mapping

| User says / implies | Rules to apply | Files to load |
|---------------------|----------------|---------------|
| New feature, roadmap, plan | feature-roadmap | CONTEXT.md, FEATURE_ROADMAP.md, FRONTEND_PLAN, BACKEND_PLAN |
| Bug, fix, broken, error | bug-fix | AGENT_MEMORY.md, logs_agent/ |
| Frontend, React, TSX, component | frontend-impl | FRONTEND_PLAN.MD, feature file, task_plan |
| Backend, API, FastAPI | backend-impl | BACKEND_PLAN.md |
| New node type on canvas | new-node-type | (see rule for 8-file list) |
| Database, Supabase, migration | supabase-db | migrations, schema |
| After any task | log-update | logs_agent/YYYY-MM-DD.md |
| UX, lovable, delight | min-lovable-product | (guidance only) |
| Test, QA, coverage, "write tests" | qa-agent (skill) | Context/testing/conventions.md, testing-stack.md, source files |

---

## Summary

1. **Extract** — Parse intent, domain, entities, constraints
2. **Map** — Use rule registry to select rules and context files
3. **Load** — Read those files into context (do not rely on @)
4. **Apply** — Execute per rule instructions
5. **Include** — Load any source files needed for the edit

The programmer can describe work in natural language; you orchestrate the rest.
