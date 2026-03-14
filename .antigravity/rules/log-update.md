---
description: Auto-applied after every completed task. Appends to daily agent log and optionally updates AGENT_MEMORY.md with non-obvious decisions. This is always the last step in any workflow.
---

# Log Update Rule

> After EVERY completed task, do both of these:

## 1. Append to `Context/memory/logs_agent/YYYY-MM-DD.md`

Use today's date. Create the file if it does not exist using `write_to_file`.

```markdown
## [Task title] -- [HH:MM]
**Agent:** Antigravity -- [area of work]

### What changed
- `path/to/file.tsx` -- [one line description]
- `path/to/file.py` -- [one line description]

### Root causes fixed (if bug fix)
- [cause] in [file]

### Mobile audit result (if UI change)
- [PASS / N issues found and fixed]

### Research / sources (if applicable)
- [Article title](URL) -- [key takeaway used]

### Next steps
- [ ] [anything left to do]
```

## 2. Append to `Context/memory/AGENT_MEMORY.md`

Only if a non-obvious decision or lesson was learned:

```markdown
## [Short title] -- [YYYY-MM-DD]
**Context:** [why this decision was made]
**Decision:** [what was done]
**Don't repeat:** [what NOT to do next time]
```

## 3. Key findings from research

When research yields actionable insights:
- Add to `AGENT_MEMORY.md` with source links
- Format:
```markdown
## [Topic] -- [YYYY-MM-DD]
**Source:** [Article title](URL)
**Key finding:** [1-2 sentence takeaway]
**Apply when:** [when to use this]
```

## When NOT to update AGENT_MEMORY.md

- Routine feature implementation with no surprises -- skip
- Only update for: non-obvious bugs, architectural pivots, "I wish I knew this earlier" moments, actionable research findings
