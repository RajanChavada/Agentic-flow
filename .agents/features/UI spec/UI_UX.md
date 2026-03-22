# Neurovn — UI/UX Improvements Specification

> Covers canvas interaction improvements, the complexity bar redesign,
> sharing/collaboration, and general polish required for launch.

---

## 1. Undo / Redo

**Keyboard shortcuts:** `Cmd+Z` / `Ctrl+Z` (undo), `Cmd+Shift+Z` / `Ctrl+Shift+Z` (redo)

### Operations Tracked in History

| Operation | Undo action |
|-----------|------------|
| Add node | Remove node |
| Delete node | Restore node + all its edges |
| Add edge | Remove edge |
| Delete edge | Restore edge |
| Move node | Return node to prior position |
| Config save (node) | Revert node data to prior config |
| Rename node label | Revert to prior label |
| Add group box | Remove group box |
| Delete group box | Restore group box |

### History Stack Rules

- Max depth: 50 operations
- When stack is full: drop oldest operation
- Redo stack is cleared when a new operation is performed after an undo
- History is session-only — does not persist across page reload or save/load

### Implementation Note

Use a command pattern with `do()` / `undo()` on each operation type. Store deltas, not full snapshots, to keep memory usage low.

---

## 2. Inline Node Label Editing

### Trigger

Double-click on the node label text directly on the canvas.

### Behaviour

1. Label text becomes an `<input>` (or `contenteditable` span) inline on the node card
2. Input is pre-populated with the current label
3. Input is auto-focused, all text selected
4. `Enter` or click-outside → commits the new label
5. `Escape` → cancels and reverts to prior label
6. Empty string → reverts to prior label (not allowed)
7. Max 40 characters — input enforces this

### Node Card Update

The node card subtitle and config panel header update immediately on commit.

### History

Label rename is captured in undo history.

---

## 3. Canvas Stats Bar Redesign

**Replace the current `R:0 W:0 X:0 N:0 | Low` bar with:**

```
nodes: 5  |  depth: 3  |  loops: 1  |  branches: 2  |  complexity: Medium  ⓘ
```

### Field Definitions

| Field | What it counts |
|-------|---------------|
| `nodes` | All non-start/finish nodes on canvas |
| `depth` | Longest path from Start to Finish in hops |
| `loops` | Detected back-edges (cycles) |
| `branches` | Number of Condition nodes |
| `complexity` | Derived label (see scoring in Estimation Engine Spec §7) |

### Interaction

- Hovering the `complexity: X` badge shows a tooltip:
  > "Agentic complexity score. Higher = more expensive and less predictable. Based on node count, depth, loops, branching, and parallelism."
- Each field also has a hover tooltip explaining what it counts
- Bar updates live on every canvas mutation (node add/remove, edge add/remove)

### Styling

- Muted monospace text, aligned right in the canvas header
- Complexity label is a coloured badge:
  - Low → green
  - Medium → yellow
  - High → orange
  - Very High → red

---

## 4. Disconnected Node Validation

### Visual Indicator

A node with zero edges (in or out) renders with a **red dashed border** instead of its normal border.

- Start node is exempt (it has no in-edges by design)
- Finish node is exempt from requiring out-edges

### Hover Tooltip

On hover of a disconnected node:
> "This node is not connected and won't be included in estimation. Connect it to the workflow or delete it."

### Pre-Estimation Check

Before "Run Workflow & Gen Estimate" executes:

1. Scan all nodes for zero-edge state
2. If any found: open a validation modal:

```
┌──────────────────────────────────────────┐
│  ⚠ Disconnected Nodes Detected           │
├──────────────────────────────────────────┤
│                                          │
│  The following nodes are not connected   │
│  to the workflow and will be excluded    │
│  from estimation:                        │
│                                          │
│    • Summarizer (Agent)                  │
│    • MCP Web Search (Tool)               │
│                                          │
│  [ Go Back ]       [ Proceed Anyway ]    │
└──────────────────────────────────────────┘
```

3. "Go Back" closes the modal
4. "Proceed Anyway" runs estimation on the connected subgraph only

---

## 5. Read-Only Shareable Canvas Link

### Share Button

Add a `Share` button to the header, between Save and Sign In.
Icon: chain-link or share arrow.

### Share Modal

```
┌──────────────────────────────────────────┐
│  Share Workflow                     ×   │
├──────────────────────────────────────────┤
│                                          │
│  Public link                  [ OFF ▷ ] │
│                                          │
│  ─────────── (link hidden when off) ─── │
│                                          │
│  When enabled, anyone with the link     │
│  can view this workflow (read-only).    │
│  They cannot edit or copy it.           │
│                                          │
└──────────────────────────────────────────┘
```

When toggled ON:

```
┌──────────────────────────────────────────┐
│  Share Workflow                     ×   │
├──────────────────────────────────────────┤
│                                          │
│  Public link                  [ ON  ◁ ] │
│                                          │
│  neurovn.app/view/a3f9bc12              │
│  [ ─────────────────────────── ] [Copy] │
│                                          │
│  Anyone with this link can view         │
│  this workflow (read-only).             │
│                                          │
│  [ Disable link ]                        │
└──────────────────────────────────────────┘
```

### Read-Only View Route: `/view/[uuid]`

The read-only view:

- Renders the canvas with all nodes and edges (no edit controls)
- Left sidebar is hidden
- Header shows: `Neurovn  /  {workflow_name}  [Read-only]`
- No dragging, no double-click to configure, no edge creation
- Estimation report is shown (read-only) if one was generated at save time
- "Open in Neurovn" button — clicking redirects to sign-up/login, then forks the workflow into the viewer's account (viral loop)
- Accessible without login

### Database Schema Addition

```sql
ALTER TABLE canvases ADD COLUMN is_public BOOLEAN DEFAULT FALSE;
ALTER TABLE canvases ADD COLUMN public_uuid UUID DEFAULT gen_random_uuid();
ALTER TABLE canvases ADD COLUMN last_estimation_report JSONB;
```

---

## 6. Saved Workflows Panel — Thumbnail Previews

### Current State

Left sidebar "SAVED WORKFLOWS" section shows a text list.

### New State

When user has ≥ 1 saved workflow:

```
SAVED WORKFLOWS

┌─────────────┐  ┌─────────────┐
│ [thumbnail] │  │ [thumbnail] │
│             │  │             │
│ RAG Pipeline│  │ Multi-Agent │
│ 3 nodes     │  │ 7 nodes     │
└─────────────┘  └─────────────┘
┌─────────────┐
│ [thumbnail] │
│             │
│ Research    │
│ 5 nodes     │
└─────────────┘
```

### Thumbnail Generation

- On every Save: call the existing PNG export function at reduced resolution (300×200px, white background)
- Upload to Supabase Storage (or S3) at path: `thumbnails/{user_id}/{canvas_uuid}.png`
- Store URL in `canvases.thumbnail_url`
- Fallback when no thumbnail: show a grey placeholder with a node-graph icon

### Card Interaction

- Click: opens the workflow
- Hover: shows workflow name tooltip and last-saved timestamp
- Right-click / long-press: context menu with "Rename", "Delete", "Share"

---

## 7. Help Modal — Colour Differentiation

### Current State

The Help modal trigger (button in header) uses the same muted styling as Layout and other utility buttons.

### Change

- Help button gets a distinct border/color to stand out as a "new user entry point"
- Suggested: outlined style with a soft blue or teal, distinct from the export (yellow) and run (blue) buttons
- Tooltip on hover: "Learn how Neurovn works"

### Help Modal Content Improvements

Add `(i)` tooltip support within the modal body — key terms like "Context accumulation", "Branch probability", and "Task Type" should be hoverable within the help text to show a one-liner without navigating away.

---

## 8. Template Library

### Current Template Modal

The current modal shows 8 templates in a 4-column grid with category badges.

### Improvements

**"Browse all templates" view:**

- Full-page overlay (not a small modal)
- Left column: category filter tabs
  - All
  - RAG
  - Orchestration
  - Research
  - Custom
- Search bar at top: "Search templates..."
- Card grid with: thumbnail preview, name, category badge, node count, brief description (1 line)

**Each template card:**

```
┌────────────────────────────┐
│  [mini canvas preview]     │
│                            │
│  Research Loop        🔬   │
│  research · 4 nodes        │
│  Plan, execute, and loop   │
│  until task is complete.   │
└────────────────────────────┘
```

**Template hover state:** "Use this template →" overlay button

---

## 9. Keyboard Shortcuts Reference

To be documented in the Help modal under a new "Shortcuts" tab:

| Action | Mac | Windows/Linux |
|--------|-----|---------------|
| Undo | Cmd+Z | Ctrl+Z |
| Redo | Cmd+Shift+Z | Ctrl+Shift+Z |
| Delete selected node/edge | Backspace / Delete | Backspace / Delete |
| Select all | Cmd+A | Ctrl+A |
| Zoom to fit | Cmd+Shift+F | Ctrl+Shift+F |
| Save | Cmd+S | Ctrl+S |
| New workflow | Cmd+N | Ctrl+N |
| Close config panel | Escape | Escape |
| Edit node label | Double-click label | Double-click label |

---

## 10. Mobile Fallback

The canvas requires a desktop browser. On viewports < 768px wide:

**Canvas route:** Show an interstitial instead of the canvas:

```
┌───────────────────────────┐
│  🖥                        │
│                           │
│  Canvas requires          │
│  a desktop browser        │
│                           │
│  Neurovn's workflow       │
│  editor works best on     │
│  screens 1024px or wider. │
│                           │
│  [ Open on Desktop →  ]   │
│  (copies URL to clipboard)│
└───────────────────────────┘
```

**Landing page and saved workflows dashboard:** Fully responsive. No interstitial.

---

## 11. Auto-Save

To prevent data loss without requiring the user to manually hit Save:

- Debounced auto-save: 3 seconds after the last canvas mutation
- Shows a subtle "Saving..." → "Saved" indicator next to the Save button
- Auto-save only triggers if user is logged in
- Auto-save does not overwrite a saved workflow's name (uses the same UUID)
- Manual "Save" button still exists and triggers immediately

---

*Document version: 1.0 — Neurovn UI/UX spec, March 2026*