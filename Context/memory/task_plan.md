## Task: Paywall Gates Implementation (Task #7)
### Files to modify:
1. `NameWorkflowModal.tsx` - Canvas limit gate before creating new canvas
2. `HeaderBar.tsx` / `ShareWorkflowModal.tsx` - Share links gate
3. `ExportDropdown.tsx` - Advanced export gate (PDF, SVG, Markdown)
4. `EstimatePanel.tsx` - Full dashboard gate (charts, scaling analysis)
5. `components/page.tsx` landing page - Add Pricing link (already done)

### Implementation approach:
- Use `useGate` hook or direct `useCanvasLimitGate` / `useCanUseFeature`
- Show UpgradeModal when gated
- For canvas limit: check count before allowing save/create
- For share: disable share button/link if !canUseFeature('share_links')
- For export: hide advanced export options if !canUseFeature('export_markdown' or export_pdf)
- For dashboard: hide charts/tab if !canUseFeature('dashboard_level') == 'full'

### Notes:
- PAYWALL_ENABLED flag controls if gates are active
- When disabled, all features available (hook returns true)
- Canvas count comes from workflows count per user
