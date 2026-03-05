# Plan: EstimatePanel Decomposition

**Phase:** 0 - Foundation
**Requirement(s):** FNDX-02
**Depends on:** 00-1-PLAN.md (need test framework to verify)

## Goal

Decompose the 1729-line monolithic `EstimatePanel.tsx` into 6 focused sub-components organized by dashboard section, while maintaining identical visual appearance and behavior.

## Tasks

### Task 1: Create estimate/ Directory and Shared Components

**Files:**
- `frontend/src/components/estimate/` (create directory)
- `frontend/src/components/estimate/DashboardSection.tsx` (create)
- `frontend/src/components/estimate/types.ts` (create)

**Action:**

1. Create the estimate directory:

```bash
mkdir -p frontend/src/components/estimate
```

2. Extract `DashboardSection` (currently inline in EstimatePanel) to its own file `DashboardSection.tsx`:

```typescript
"use client";

import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

export type SectionId = 'health' | 'breakdown' | 'cycles' | 'scaling' | 'observability';

interface DashboardSectionProps {
  id: SectionId;
  title: string;
  icon: React.ReactNode;
  collapsed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  isDark: boolean;
}

export default function DashboardSection({
  id,
  title,
  icon,
  collapsed,
  onToggle,
  children,
  isDark,
}: DashboardSectionProps) {
  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onToggle}
        className={`
          w-full flex items-center gap-2 py-2 -mx-1 px-1 rounded-lg transition-colors
          ${isDark ? 'hover:bg-slate-800/60 text-slate-200' : 'hover:bg-gray-100 text-gray-700'}
        `}
      >
        {collapsed ? (
          <ChevronRight className="w-4 h-4 shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 shrink-0" />
        )}
        <span className="w-4 h-4 shrink-0 flex items-center justify-center">{icon}</span>
        <span className="text-sm font-semibold">{title}</span>
      </button>
      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ maxHeight: collapsed ? 0 : 2000 }}
      >
        <div className="space-y-4">{children}</div>
      </div>
    </div>
  );
}
```

3. Create `types.ts` with shared types for sub-components:

```typescript
/**
 * Shared types for EstimatePanel sub-components.
 */
import type { WorkflowEstimation, NodeEstimation } from '@/types/workflow';

// Extended breakdown with node type info
export interface BreakdownWithType extends NodeEstimation {
  nodeType: string;
}

// Props passed to sub-components from parent EstimatePanel
export interface EstimatePanelContext {
  estimation: WorkflowEstimation;
  isDark: boolean;
  isFullscreen: boolean;
  heroTextClass: string;
}

// Section collapse state
export type SectionCollapseState = Record<
  'health' | 'breakdown' | 'cycles' | 'scaling' | 'observability',
  boolean
>;

// Colour maps (shared constants)
export const NODE_COLOURS: Record<string, string> = {
  agentNode: '#3b82f6',
  toolNode: '#f59e0b',
  startNode: '#22c55e',
  finishNode: '#ef4444',
};

export const DOT_COLOURS: Record<string, string> = {
  agentNode: 'bg-blue-500',
  toolNode: 'bg-amber-500',
  startNode: 'bg-green-500',
  finishNode: 'bg-red-500',
};
```

**Verification:**
- [ ] `ls frontend/src/components/estimate/` shows `DashboardSection.tsx` and `types.ts`
- [ ] `npx tsc --noEmit` passes

---

### Task 2: Extract Sub-Components (Part 1 - Header and Overview)

**Files:**
- `frontend/src/components/estimate/OverviewSection.tsx` (create)
- `frontend/src/components/estimate/HealthSection.tsx` (create)

**Action:**

Extract the Overview (hero cards) and Health sections. These are the top sections of the panel.

**OverviewSection.tsx** - The 3 hero cards (Tokens, Cost, Latency):

```typescript
"use client";

import React from 'react';
import type { WorkflowEstimation } from '@/types/workflow';

interface OverviewSectionProps {
  estimation: WorkflowEstimation;
  isDark: boolean;
  isFullscreen: boolean;
  heroTextClass: string;
}

export default function OverviewSection({
  estimation,
  isDark,
  isFullscreen,
  heroTextClass,
}: OverviewSectionProps) {
  return (
    <div className="space-y-4">
      {/* Hero row: 3 cards */}
      <div className={`grid ${isFullscreen ? 'grid-cols-3' : 'grid-cols-1 sm:grid-cols-3'} gap-4 min-w-0`}>
        {/* Tokens card */}
        <div
          className={`
            rounded-xl border p-5 min-h-[120px] flex flex-col min-w-0 overflow-hidden
            ${isDark ? 'bg-muted/50 border-slate-700' : 'bg-muted/50 border-gray-200'}
          `}
        >
          <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            Token Usage
          </p>
          {estimation.token_range ? (
            <>
              <p className={`${heroTextClass} font-bold mt-1 tabular-nums`}>
                {estimation.token_range.avg.toLocaleString()}
              </p>
              <div className={`text-[10px] mt-1 flex gap-3 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                <span>Min: {estimation.token_range.min.toLocaleString()}</span>
                <span>Max: {estimation.token_range.max.toLocaleString()}</span>
              </div>
            </>
          ) : (
            <p className={`${heroTextClass} font-bold mt-1 tabular-nums`}>
              {estimation.total_tokens.toLocaleString()}
            </p>
          )}
          <p className={`text-xs mt-auto ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>Tokens (avg)</p>
        </div>

        {/* Cost card */}
        <div
          className={`
            rounded-xl border p-5 min-h-[120px] flex flex-col min-w-0 overflow-hidden
            ${isDark ? 'bg-muted/50 border-slate-700' : 'bg-muted/50 border-gray-200'}
          `}
        >
          <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            Cost
          </p>
          {estimation.cost_range ? (
            <p className={`${heroTextClass} font-bold mt-1 tabular-nums`}>
              ${estimation.cost_range.avg.toFixed(4)}
            </p>
          ) : (
            <p className={`${heroTextClass} font-bold mt-1 tabular-nums`}>
              ${estimation.total_cost.toFixed(4)}
            </p>
          )}
          {estimation.cost_range && (
            <p className={`text-[10px] mt-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              ${estimation.cost_range.min.toFixed(4)} - ${estimation.cost_range.max.toFixed(4)}
            </p>
          )}
          <p className={`text-xs mt-auto ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>Per run</p>
        </div>

        {/* Latency card */}
        <div
          className={`
            rounded-xl border p-5 min-h-[120px] flex flex-col min-w-0 overflow-hidden
            ${isDark ? 'bg-muted/50 border-slate-700' : 'bg-muted/50 border-gray-200'}
          `}
        >
          <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            Latency
          </p>
          {estimation.latency_range ? (
            <>
              <p className={`${heroTextClass} font-bold mt-1 tabular-nums`}>
                {estimation.latency_range.avg.toFixed(2)}s
              </p>
              <div className={`text-[10px] mt-1 flex gap-3 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                <span>Min: {estimation.latency_range.min.toFixed(2)}s</span>
                <span>Max: {estimation.latency_range.max.toFixed(2)}s</span>
              </div>
            </>
          ) : (
            <p className={`${heroTextClass} font-bold mt-1 tabular-nums`}>
              {estimation.total_latency.toFixed(2)}s
            </p>
          )}
          <p className={`text-xs mt-auto ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
            P95 estimate
            {estimation.total_tool_latency > 0 && (
              <span className={`ml-1 ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                - {(estimation.total_tool_latency * 1000).toFixed(0)} ms tool
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Graph type + Health badge inline */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
          Graph type: <span className="font-semibold">{estimation.graph_type}</span>
        </span>
        {estimation.health && (
          <span
            className={`
              text-xs px-2.5 py-1 rounded-md font-semibold
              ${estimation.health.grade === 'A' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' :
                estimation.health.grade === 'B' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' :
                estimation.health.grade === 'C' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' :
                estimation.health.grade === 'D' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' :
                'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'}
            `}
          >
            Health: {estimation.health.grade} ({estimation.health.score}/100)
          </span>
        )}
      </div>
    </div>
  );
}
```

**HealthSection.tsx** - Extract the Health & Bottlenecks collapsible section (lines 531-845 from original).

This component receives:
- `estimation: WorkflowEstimation`
- `breakdownWithType: BreakdownWithType[]`
- `nodes: Node<WorkflowNodeData>[]` (for critical path labels)
- `isDark: boolean`
- `collapsed: boolean`
- `onToggle: () => void`

Extract the entire DashboardSection with id="health" content.

**Verification:**
- [ ] `ls frontend/src/components/estimate/` shows `OverviewSection.tsx` and `HealthSection.tsx`
- [ ] `npx tsc --noEmit` passes

---

### Task 3: Extract Remaining Sub-Components (Part 2)

**Files:**
- `frontend/src/components/estimate/CyclesSection.tsx` (create)
- `frontend/src/components/estimate/BreakdownSection.tsx` (create)
- `frontend/src/components/estimate/ScalingSection.tsx` (create)
- `frontend/src/components/estimate/ObservabilitySection.tsx` (create)

**Action:**

Extract remaining collapsible sections. Each follows the same pattern:

**CyclesSection.tsx** - Detected cycles display (lines 847-1003):
- Props: `estimation`, `isDark`, `collapsed`, `onToggle`
- Only renders if `estimation.detected_cycles?.length > 0`

**BreakdownSection.tsx** - Model mix, tool impact, detailed table (lines 1005-1390):
- Props: `estimation`, `breakdownWithType`, `isDark`, `collapsed`, `onToggle`
- Contains pie charts, tool impact cards, and detailed breakdown table

**ScalingSection.tsx** - What-if scaling controls (lines 1392-1559):
- Props: `estimation`, `scalingParams`, `setRunsPerDay`, `setLoopIntensity`, `scalingLoading`, `isDark`, `collapsed`, `onToggle`
- Contains runs/day slider, loop intensity slider, sensitivity readout, projections

**ObservabilitySection.tsx** - Actual vs estimated, charts (lines 1561-1722):
- Props: `estimation`, `actualStats`, `setActualStats`, `clearActualStats`, `chartData`, `activeBreakdown`, `isDark`, `collapsed`, `onToggle`
- Contains paste JSON input, comparison table, token distribution chart

**Implementation approach:**
1. Copy relevant JSX from original file into new component
2. Create props interface with all needed data/callbacks
3. Replace inline references with prop access
4. Add `"use client"` directive at top
5. Wrap component export in `React.memo` for performance

**Verification:**
- [ ] All 4 new section files exist
- [ ] `npx tsc --noEmit` passes

---

### Task 4: Refactor EstimatePanel as Composition Shell

**Files:**
- `frontend/src/components/EstimatePanel.tsx` (move to `estimate/EstimatePanel.tsx`)
- `frontend/src/components/estimate/index.ts` (create barrel export)

**Action:**

1. Move EstimatePanel.tsx to the estimate/ directory:

```bash
mv frontend/src/components/EstimatePanel.tsx frontend/src/components/estimate/EstimatePanel.tsx
```

2. Refactor EstimatePanel to import and compose sub-components:

```typescript
"use client";

import React, { useCallback, useRef, useState, useEffect } from 'react';
import { BarChart3 } from 'lucide-react';
import {
  useEstimation,
  useUIState,
  useWorkflowStore,
  useScalingParams,
  useActualStats,
} from '@/store/useWorkflowStore';

// Sub-components
import DashboardSection, { SectionId } from './DashboardSection';
import OverviewSection from './OverviewSection';
import HealthSection from './HealthSection';
import CyclesSection from './CyclesSection';
import BreakdownSection from './BreakdownSection';
import ScalingSection from './ScalingSection';
import ObservabilitySection from './ObservabilitySection';
import { BreakdownWithType, NODE_COLOURS } from './types';

// ... keep constants (PANEL_MIN_WIDTH, PANEL_MAX_WIDTH, getHeroTextClass, loadSectionState, saveSectionState)

export default function EstimatePanel() {
  // All hooks stay the same
  const estimation = useEstimation();
  const { isEstimatePanelOpen, theme } = useUIState();
  // ... etc

  // Derived data stays here
  const breakdownWithType: BreakdownWithType[] = (estimation?.breakdown ?? []).map((b) => {
    const matchedNode = nodes.find((n) => n.id === b.node_id);
    return { ...b, nodeType: matchedNode?.type ?? 'agentNode' };
  });

  // ... keep all existing state management (resize, section collapse, scaling)

  if (!estimation) return null;

  return (
    <>
      {/* Backdrop */}
      {isEstimatePanelOpen && (
        <div className={`fixed inset-0 z-40 ...`} onClick={...} />
      )}

      {/* Panel */}
      <div className={`fixed z-50 flex ...`} style={...}>
        {/* Resize handle */}
        {!isFullscreen && <div onMouseDown={onMouseDown} className="..." />}

        {/* Content */}
        <div className="flex-1 flex flex-col ...">
          {/* Header - keep inline, it's small */}
          <div className="flex items-center justify-between px-5 py-4 ...">
            {/* ... header content ... */}
          </div>

          {/* Body - compose sections */}
          <div className="flex-1 overflow-y-auto px-5 py-5 ...">
            <div className="space-y-6">
              {/* Overview (always visible) */}
              <OverviewSection
                estimation={estimation}
                isDark={isDark}
                isFullscreen={isFullscreen}
                heroTextClass={heroTextClass}
              />

              {/* Health & Bottlenecks */}
              <HealthSection
                estimation={estimation}
                breakdownWithType={breakdownWithType}
                nodes={nodes}
                isDark={isDark}
                collapsed={sectionCollapsed.health}
                onToggle={() => toggleSection('health')}
              />

              {/* Cycles (conditional) */}
              {estimation.detected_cycles?.length > 0 && (
                <CyclesSection
                  estimation={estimation}
                  isDark={isDark}
                  collapsed={sectionCollapsed.cycles}
                  onToggle={() => toggleSection('cycles')}
                />
              )}

              {/* Breakdown */}
              <BreakdownSection
                estimation={estimation}
                breakdownWithType={breakdownWithType}
                isDark={isDark}
                collapsed={sectionCollapsed.breakdown}
                onToggle={() => toggleSection('breakdown')}
              />

              {/* Scaling & Planning */}
              <ScalingSection
                estimation={estimation}
                scalingParams={scalingParams}
                setRunsPerDay={setRunsPerDay}
                setLoopIntensity={setLoopIntensity}
                scalingLoading={scalingLoading}
                isDark={isDark}
                collapsed={sectionCollapsed.scaling}
                onToggle={() => toggleSection('scaling')}
              />

              {/* Observability */}
              <ObservabilitySection
                estimation={estimation}
                actualStats={actualStats}
                setActualStats={setActualStats}
                clearActualStats={clearActualStats}
                chartData={chartData}
                activeBreakdown={activeBreakdown}
                isDark={isDark}
                collapsed={sectionCollapsed.observability}
                onToggle={() => toggleSection('observability')}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
```

3. Create barrel export `index.ts`:

```typescript
export { default as EstimatePanel } from './EstimatePanel';
export { default as DashboardSection } from './DashboardSection';
export { default as OverviewSection } from './OverviewSection';
export { default as HealthSection } from './HealthSection';
export { default as CyclesSection } from './CyclesSection';
export { default as BreakdownSection } from './BreakdownSection';
export { default as ScalingSection } from './ScalingSection';
export { default as ObservabilitySection } from './ObservabilitySection';
```

4. Update import in any file that imports EstimatePanel:

```typescript
// Old
import EstimatePanel from '@/components/EstimatePanel';

// New (either works)
import EstimatePanel from '@/components/estimate/EstimatePanel';
// OR
import { EstimatePanel } from '@/components/estimate';
```

**Verification:**
- [ ] `ls frontend/src/components/estimate/` shows 8+ files
- [ ] `npx tsc --noEmit` passes
- [ ] `cd frontend && npm run dev` starts without errors
- [ ] Opening EstimatePanel shows identical UI to before

---

## Verification Checklist

- [ ] `ls frontend/src/components/estimate/` shows: `EstimatePanel.tsx`, `DashboardSection.tsx`, `types.ts`, `index.ts`, `OverviewSection.tsx`, `HealthSection.tsx`, `CyclesSection.tsx`, `BreakdownSection.tsx`, `ScalingSection.tsx`, `ObservabilitySection.tsx`
- [ ] Original `frontend/src/components/EstimatePanel.tsx` no longer exists (moved to estimate/)
- [ ] `cd frontend && npx tsc --noEmit` passes
- [ ] `cd frontend && npm run test:run` passes
- [ ] `cd frontend && npm run dev` starts and EstimatePanel renders correctly
- [ ] Visual parity: Collapsible sections work, charts render, resize works, dark mode works

## Success Criteria

- EstimatePanel.tsx is under 300 lines (composition shell)
- 6 sub-components handle individual dashboard sections
- Zero behavior change - same appearance, same functionality
- User viewing EstimatePanel sees organized sub-sections instead of single monolithic view
- All existing selector hook usage preserved
