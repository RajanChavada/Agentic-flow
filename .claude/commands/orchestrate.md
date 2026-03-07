---
name: orchestrate
description: Parse natural language intent, map to the right context and rules, and execute. Use when describing a task in plain language.
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Task
  - AskUserQuestion
  - WebFetch
---
<objective>
Extract programmer intent from natural language, load the correct context files and conventions, then execute the task. This is the Claude Code equivalent of the Cursor orchestration skill.
</objective>

<context>
$ARGUMENTS
</context>

<process>

## Step 1 -- Extract Intent

Parse the user's message and extract:

| Field | What to capture |
|-------|-----------------|
| **Primary intent** | What does the user want? (feature, bug fix, refactor, new node type, QA, etc.) |
| **Domain** | Frontend, backend, database, full-stack, or mixed |
| **Key entities** | Files, components, endpoints, tables, or concepts mentioned |
| **Constraints** | "Don't touch X", "follow Y pattern", "use Z library" |
| **Output expectations** | New file, edit existing, create feature doc, run migration, etc. |

Write a brief intent summary (2-4 lines) before proceeding.

## Step 2 -- Map Intent to Context Files

Based on the intent, select which files to load:

| User says / implies | Command to suggest | Files to load |
|---------------------|-------------------|---------------|
| New feature, roadmap, plan | `/feature` | CONTEXT.md, FEATURE_ROADMAP.md, FRONTEND_PLAN, BACKEND_PLAN |
| Bug, fix, broken, error | `/bugfix` | AGENT_MEMORY.md, logs_agent/ |
| Frontend, React, TSX, component | `/frontend` | FRONTEND_PLAN.MD, feature file, task_plan |
| Backend, API, FastAPI | `/backend` | BACKEND_PLAN.md |
| Database, Supabase, migration | n/a | supabase.md, migrations |
| Test, QA, coverage | `/qa` | testing/conventions.md, source files |
| UX, lovable, delight | n/a | (MLP guidance below) |

If a more specific command fits, suggest the user run it directly. Otherwise, load the files and proceed.

## Step 3 -- Load Context Proactively

Read the selected files into context before making changes. Do not assume they are already loaded.

1. The context docs from the mapping above
2. Feature files from `Context/features/` or `.ai/context/features/` if one exists for this task
3. Memory: `Context/memory/AGENT_MEMORY.md` for bugs/decisions; `Context/memory/logs_agent/` for recent changes
4. Source files mentioned or implied by the intent

Explicitly list which files you are loading and why, then read them.

## Step 4 -- Execute

Follow the conventions from the loaded context:
- If frontend work: write `Context/memory/task_plan.md` first
- If bug fix: identify ALL root causes before writing any fix
- If feature: create structured spec before implementation
- If QA: research via Exa before designing tests

Execute the task according to the loaded conventions. Do not skip mandatory steps.

## Step 5 -- Post-Task

1. Run verification: `npx tsc --noEmit` (frontend) and/or `python -c "from main import app"` (backend)
2. Append to `Context/memory/logs_agent/YYYY-MM-DD.md`:
   ```
   ## [Task Type]: [short title] -- [HH:MM]
   **Agent:** [role]
   **Files changed:** [list]
   **Notes:** [anything non-obvious]
   ```
3. Update `Context/memory/AGENT_MEMORY.md` if non-obvious decisions were made

## MLP Guidance

When making UX decisions, follow Minimum Lovable Product philosophy:
- Functional < Reliable < Usable < Lovable -- don't stop at usable
- Fast, obvious, opinionated UI
- Keep it minimal -- MLP is not gold-plating; find the simplest lovable version

</process>
