# Neurovn — Pre-Launch Checklist

> Use this as the gate before going public.  
> Every P0 item must be ✅ before launch.  
> P1 items should be done within the first week.

---

## P0 — Must Ship Before Launch

### Product

- [ ] **[P0-01] Undo/Redo** — Cmd+Z / Cmd+Shift+Z, 50-op history, all canvas mutations captured
- [ ] **[P0-02] Inline node label editing** — double-click on label, Enter to commit, Escape to cancel
- [ ] **[P0-03] Canvas stats bar replacement** — `nodes | depth | loops | branches | complexity` with complexity badge and tooltip
- [ ] **[P0-04] Model pricing data verified and timestamped** — all 7 providers audited against current docs, `last_updated` field in models.json, staleness warning if > 30 days
- [ ] **[P0-05] Disconnected node validation** — red dashed border on unconnected nodes, pre-estimation modal listing them

### Infrastructure

- [ ] Custom domain configured (not `neurovn-alpha.vercel.app`)
- [ ] SSL certificate active on production domain
- [ ] Environment variables set in production (not `.env.local`)
- [ ] Error monitoring configured (Sentry or equivalent)
- [ ] Basic rate limiting on `/api/estimate` endpoint

### Legal / Trust

- [ ] Privacy policy page live (even a simple one)
- [ ] Terms of service page live
- [ ] Cookie banner if analytics are running

---

## P1 — Launch Week (Within 7 Days of Launch)

- [ ] **[P1-01] Live per-node cost update** — model change in config → node card `~$X / call` updates on Save
- [ ] **[P1-02] Read-only shareable link** — `/view/[uuid]` route, Share button in header, toggle in modal
- [ ] **[P1-03] Tabbed agent config panel** — Model / Estimation / Tools tabs, Save/Cancel always visible
- [ ] **[P1-04] Multi-tool binding on agent node** — Tools tab, up to 8 tools, chips on node card, token impact shown live
- [ ] **[P1-05] Estimation section rename + (i) tooltips** — "Estimation Inputs", tooltip on each field
- [ ] Auto-save (3s debounce after last mutation, logged-in users only)
- [ ] Keyboard shortcut `Cmd+S` to save

---

## P2 — Post-Launch Sprint

- [ ] **[P2-01] LangGraph code export** — deterministic transpiler, `.py` + `requirements.txt` + `.env.example` download
- [ ] **[P2-02] Model registry expansion + "See more providers"** — Tier 1/Tier 2 split, model search input
- [ ] **[P2-03] "Request a model" feedback flow** — modal → GitHub Issue via API
- [ ] **[P2-04] Canvas thumbnail previews** — generated on save, stored in object storage, shown in sidebar
- [ ] **[P2-05] Extended template library** — 7 new templates, filterable full-screen template browser

---

## Smoke Test Checklist (run before every deploy)

These are the critical user paths that must work before any deploy goes live:

### Path 1 — New User, Blank Canvas
- [ ] Load app as logged-out user
- [ ] Template modal appears
- [ ] Click "Start from scratch" — modal closes, blank canvas loads
- [ ] Drag Agent node to canvas
- [ ] Double-click node — config panel opens
- [ ] Select provider + model — pricing card populates
- [ ] Type system prompt — token counter updates
- [ ] Click Save — panel closes, node card shows model name
- [ ] Drag Start and Finish nodes
- [ ] Connect Start → Agent → Finish
- [ ] Click "Run Workflow & Gen Estimate" — estimation report appears
- [ ] Export → Export (.neurovn.json) — file downloads

### Path 2 — Template Load
- [ ] Click Templates in header
- [ ] Select "Simple RAG" template
- [ ] Canvas loads with pre-built nodes
- [ ] Click "Run Workflow & Gen Estimate" — produces non-zero cost estimate
- [ ] Export → Canvas as PNG — image downloads

### Path 3 — Import
- [ ] Click Import in header
- [ ] Select "My Workflow" tab
- [ ] Upload a valid `.neurovn.json` file
- [ ] Canvas renders with correct nodes and edges

### Path 4 — Save and Load (Auth Required)
- [ ] Sign in
- [ ] Build a workflow
- [ ] Click Save — workflow appears in "Saved Workflows" sidebar
- [ ] Reload page
- [ ] Click saved workflow — canvas loads correctly

### Path 5 — Condition Node
- [ ] Drop Condition node on canvas
- [ ] Double-click — config panel opens
- [ ] Set condition expression and probability
- [ ] Connect an Agent node to the True output and another to the False output
- [ ] Verify node card shows True/False labels on edges

---

## Known Gaps (Accepted for Launch, Track in Backlog)

These are known issues accepted for initial launch. Track in GitHub Issues with label `known-gap`:

| Gap | Impact | Target |
|-----|--------|--------|
| No redo state after page reload | Low — session only | P2 |
| Tool node latency estimates are averages, not measured | Medium — estimation accuracy | P2 |
| Parallelism detection does not handle nested parallel forks | Low — edge case | P2 |
| Context accumulation does not handle diamond patterns (fan-out/fan-in) correctly | Medium | P2 |
| No multi-select on canvas | Low | P3 |
| No minimap | Low | P3 |
| Mobile canvas not supported | Low — most users are desktop | P3 |
| Model pricing manually maintained | Medium — could drift | P1 (audit process) |

---

*Document version: 1.0 — Neurovn pre-launch checklist, March 2026*
