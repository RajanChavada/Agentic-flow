# Neurovn — Pre-Launch Checklist (Updated)

> Updated after live site audit, March 2026.
> Additions marked with 🆕 — found during end-to-end crawl of neruovn-alpha.vercel.app
> Every P0 item must be ✅ before launch. P1 items ship within the first week.

---

## P0 — Must Ship Before Launch

### Canvas & Editor

- [ ] **[P0-01] Undo/Redo** — Cmd+Z / Cmd+Shift+Z, 50-op history, all canvas mutations captured
- [ ] **[P0-02] Inline node label editing** — double-click on label, Enter to commit, Escape to cancel
- [x] **[P0-03] Canvas stats bar replacement** — `nodes | depth | loops | branches | complexity` with complexity badge and tooltip
- [ ] **[P0-04] Model pricing data verified and timestamped** — all 7 providers audited against current docs, `last_updated` field in models.json, staleness warning if > 30 days
- [ ] **[P0-05] Disconnected node validation** — red dashed border on unconnected nodes, pre-estimation modal listing them

### 🆕 Landing Page

- [x] **[P0-06] Fix stat counters** — the four hero counters ("0+ Models", "0 Providers", "0 Node Types", "0ms Avg Estimate") are rendering as zero for all new visitors. Fix the data fetch or hardcode correct values:
  - Models: 38+
  - Providers: 7
  - Node Types: 5
  - Avg Estimate: <10ms

  These are the first numbers a cold visitor reads after the headline. Zeros look broken.

- [x] **[P0-07] Fix production domain** — the live URL is `neruovn-alpha.vercel.app` which contains a typo (`neruovn` not `neurovn`). Every link users share will have this baked in. Register and configure a clean domain (e.g. `neurovn.app`) and update all internal href values before any public announcement.

### 🆕 Critical User Path

- [x] **[P0-08] Fix unauthenticated editor route** — the primary new-user flow is:

  ```
  Landing CTA → /canvases → "Continue without signing in" → /editor → (redirect, goes nowhere)
  ```

  This is broken. Every unauthenticated visitor who clicks "Get Started" hits a dead end. The `/editor` route either loops or redirects to a blank page.

  **Acceptance criteria:** Open the site incognito → click "Get Started — It's Free" → click "Continue to editor without signing in" → land on a working blank canvas with the full editor UI. No redirects.

### 🆕 Documentation

- [x] **[P0-09] Remove "Draft" badge from `/docs/pricing`** — this page shows a "Draft" status badge to all visitors. The content is solid — the badge is the only issue. AI engineers will notice it and assume the pricing data is unreliable. Remove it or mark the page "Stable".

- [x] **[P0-10] Audit model names in the pricing docs table** — the table currently lists "GPT-5.1" as an OpenAI model. This is not a real model name as of March 2026. Technical users will catch this and it undermines trust in the entire pricing registry. Verify every model name in the table against official provider API references. Correct or remove any that don't exist.

### Infrastructure

- [ ] Production domain configured with SSL
- [ ] All environment variables set in production (not `.env.local`)
- [ ] Error monitoring active (Sentry or equivalent)
- [ ] Basic rate limiting on `/api/estimate` endpoint

### Legal

- [ ] Privacy policy page live at `/privacy`
- [ ] Terms of service page live at `/terms`
- [ ] Both pages linked from the footer
- [ ] Cookie/analytics banner present if any tracking scripts are running

---

## P1 — Launch Week (Within 7 Days)

### Canvas

- [ ] **[P1-01] Live per-node cost update** — model change in config → node card `~$X / call` updates on Save
- [ ] **[P1-02] Read-only shareable link** — `/view/[uuid]` route, Share button in header, toggle in modal
- [ ] **[P1-03] Tabbed agent config panel** — Model / Estimation / Tools tabs, Save/Cancel always visible
- [ ] **[P1-04] Multi-tool binding on agent node** — Tools tab, up to 8 tools, chips on node card, token impact shown live
- [ ] **[P1-05] Estimation section rename + (i) tooltips** — "Estimation Inputs", tooltip on each field
- [ ] Auto-save (3s debounce after last canvas mutation, logged-in users only)
- [ ] `Cmd+S` keyboard shortcut to save

### 🆕 Landing Page & Navigation

- [ ] **[P1-06] Verify Marketplace renders templates in real browser** — `/marketplace` appears empty in fetched page source. Confirm templates render client-side in a real browser. If the page is genuinely empty, remove the "Browse templates" CTA from the landing page nav and hero until content exists. A linked dead-end is worse than no link.

- [ ] **[P1-07] Newsletter subscribe confirmation state** — the subscribe input has no visible success feedback in the current markup. Add a toast or inline message ("You're in — thanks!") on submit.

- [ ] **[P1-08] Verify Scenario Comparison and Comparison Drawer exist in editor** — both are referenced prominently on the landing page (the GPT-4o vs Claude 3.5 feature card) and in Quickstart docs step 7. If these features are not functional in the current editor, remove all references to them before launch. Showing non-working features on day one is a trust-killer with a technical audience.

---

## P2 — Post-Launch Sprint

- [ ] **[P2-01] LangGraph code export** — deterministic transpiler, `.py` + `requirements.txt` + `.env.example` download
- [ ] **[P2-02] Model registry expansion + "See more providers"** — Tier 1/Tier 2 split, model search input
- [ ] **[P2-03] "Request a model" feedback flow** — modal → GitHub Issue via API
- [ ] **[P2-04] Canvas thumbnail previews** — generated on save, shown in sidebar
- [ ] **[P2-05] Extended template library** — 7 new templates, full-screen filterable browser
- [ ] **[P2-06] Docs pricing page — align tool token values with registry** — docs say "+200 schema tokens / +1600 response tokens" as fixed values, but the actual tool registry has per-tool values that vary significantly. Align docs with real engine behaviour once the estimation engine upgrade ships.

---

## Smoke Test — Run Before Every Deploy

Run all five paths in an incognito window. Do not deploy if any path fails.

### Path 1 — Unauthenticated New User (Most Critical)
- [ ] Open `neurovn.app` in incognito
- [ ] Hero stat counters show real non-zero values
- [ ] Click "Get Started — It's Free" → lands on `/canvases`
- [ ] Click "Continue to editor without signing in" → lands on **working canvas** (no redirect loop)
- [ ] Canvas is interactive — can drag nodes, connect edges

### Path 2 — Template Load
- [ ] Click "Browse templates" from landing page → `/marketplace` shows templates (not empty)
- [ ] Select a template → canvas loads with pre-built nodes
- [ ] Click "Run Workflow & Gen Estimate" → non-zero cost estimate produced

### Path 3 — Blank Canvas Flow
- [ ] Start from scratch on blank canvas
- [ ] Drag Start → Agent → Finish and connect them
- [ ] Double-click Agent → config panel opens
- [ ] Select provider + model → pricing card shows correct non-zero values
- [ ] Click Save → node card updates with model name
- [ ] Click "Run Workflow & Gen Estimate" → estimation report appears
- [ ] Export → `.neurovn.json` downloads and is valid JSON

### Path 4 — Docs End-to-End
- [ ] `/docs` loads with full sidebar
- [ ] All 5 doc pages load without errors
- [ ] No "Draft" badge visible on any page
- [ ] All model names in the pricing table are real, verifiable API strings
- [ ] "Launch Canvas" CTAs in docs land on working canvas

### Path 5 — Auth + Save
- [ ] Sign in with Google or GitHub
- [ ] Build a workflow
- [ ] Save → workflow appears in saved list
- [ ] Reload page → workflow still in list
- [ ] Click saved workflow → canvas loads correctly

---

## Known Gaps — Accepted for Launch

Track in GitHub Issues with label `known-gap`:

| Gap | Impact | Target |
|-----|--------|--------|
| No undo/redo after page reload (session-only) | Low | P2 |
| Tool latency estimates are category averages, not per-tool | Medium | P2 |
| Context accumulation not yet in engine (each node estimated independently) | Medium | P2 |
| Parallelism detection doesn't handle nested parallel forks | Low | P2 |
| No multi-select on canvas | Low | P3 |
| No minimap | Low | P3 |
| Canvas not usable on mobile | Low — target users are desktop | P3 |
| Model pricing manually maintained — can drift | Medium | Ongoing (weekly GitHub Action per P0-04) |

---

## Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | March 2026 | Initial checklist from product audit session |
| 1.1 | March 2026 | Added P0-06 through P0-10 from live site crawl. Added P1-06 through P1-08. Added unauthenticated path and docs path to smoke tests. Added legal section. |

---

*Document version: 1.1 — Neurovn pre-launch checklist, March 2026*