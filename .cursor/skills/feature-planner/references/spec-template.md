# Feature Spec Template

Use this template when creating feature specs at `Context/features/[kebab-case-name].md`.

---

## Full Mode Template

```markdown
# [Feature Name]

> **Status:** Roadmapped -- ready to implement
> **Date:** [YYYY-MM-DD]
> **Type:** [Frontend only | Backend only | Full-stack | Full-stack + Database]
> **Research mode:** Full

---

## Summary

[2-3 sentence plain description of what the feature does and why it matters.]

---

## Research Findings

### UX Patterns & Best Practices
- [Pattern 1] -- [source/reference]
- [Pattern 2] -- [source/reference]
- [Pattern 3] -- [source/reference]

### Competitor / Similar Product Approaches
- [Product 1]: [how they handle this] -- [source]
- [Product 2]: [how they handle this] -- [source]

### Key Takeaways for Implementation
1. [Actionable insight]
2. [Actionable insight]
3. [Actionable insight]

---

## MLP Evaluation

### Functional Requirements (Must Work)
- [requirement]

### Reliability Requirements (Must Be Dependable)
- [requirement]

### Usability Requirements (Must Be Intuitive)
- [requirement]

### Lovability Opportunities (Must Delight)
- [opportunity] -- [implementation hint]

### Lovemark Moments

| Moment | Trigger | Delight Pattern | Effort |
|--------|---------|-----------------|--------|
| [moment] | [when it happens] | [animation/copy/celebration] | [low/med/high] |

### What NOT to Gold-Plate
- [scope boundary]

---

## UX Specifications

### User Flow
1. User [action] in [location]
2. [Component] appears showing [content]
3. User [action] -> [result]
4. System [response] with [feedback]

### Interaction Details
- **Trigger**: [how the feature is activated]
- **Transitions**: [slide, fade, expand -- with duration guidance]
- **Loading states**: [skeleton, spinner, progressive]
- **Error states**: [inline error, toast, recovery path]
- **Empty states**: [what shows when no data]
- **Success states**: [confirmation, celebration]

### Visual Specifications
- [Colors, typography, sizing, spacing notes]
- [Dark mode considerations]
- [Mobile/responsive behavior]

---

## Architecture & Internal Research

### Existing Patterns to Follow
- [Pattern] -- found in [file]

### Architecture Constraints
- **Store slice**: [which Zustand slice owns this state]
- **React Flow**: [impact on nodes/edges/handles]
- **Supabase**: [new table, RLS, or none]
- **API**: [new endpoint or extends existing]

---

## Frontend Tasks

### [src/path/to/file.tsx]
- [ ] [specific change with field/function names]

> _Omit this section if backend-only._

---

## Backend Tasks

### [backend/path/to/file.py]
- [ ] [specific change with endpoint/model names]

> _Omit this section if frontend-only._

---

## Database Tasks

### [Migration or Supabase SQL]
- [ ] [table creation, column addition, RLS policy]

> _Omit if no database changes needed._

---

## Files to Touch

| File | Change |
|------|--------|
| `path/to/file` | [description] |

---

## Do NOT Touch

- [file] -- [reason]

---

## Acceptance Criteria

### Frontend
- [ ] [testable criterion]
- [ ] `npx tsc --noEmit` passes

### Backend
- [ ] [testable criterion]
- [ ] `python -c "from main import app"` passes

### MLP Criteria
- [ ] [lovability criterion]
- [ ] [delight moment verified working]

---

## Research References

- [Title](URL) -- [brief note]

---

## GSD Phase Mapping

### Phase N: [Name]
**Goal**: [one sentence]
**Depends on**: None
**Plans**: [count]

**Plan N-1: [name]**
- Task 1: [description] -- Files: [list]
- Verification: [checklist]

### Phase N+1: [Name]
**Goal**: [one sentence]
**Depends on**: Phase N
**Plans**: [count]

**Plan (N+1)-1: [name]**
- Task 1: [description] -- Files: [list]

### Execution
/gsd:plan-phase N
/gsd:execute-phase N

---

## Agent Prompt

When implementing this feature, read this file in full. Then:

1. **[Agent type]**: [specific instructions]
2. **Verification**: [what to run and check]

Do not modify files in the Do NOT Touch list. Follow conventions in MEMORY.md and FRONTEND_PLAN.MD / BACKEND_PLAN.md.
```

---

## Quick Mode Template

Omit these sections: Research Findings, MLP Evaluation, Research References.
Keep all other sections. Mark `**Research mode:** Quick` in the header.

The Acceptance Criteria section still includes MLP Criteria checkboxes -- fill them with basic usability expectations rather than research-backed lovemark moments.
