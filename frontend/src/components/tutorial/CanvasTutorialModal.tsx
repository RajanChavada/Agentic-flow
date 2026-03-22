"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Download,
  Save,
  BarChart3,
  Paintbrush,
  Lightbulb,
  Keyboard,
  X,
} from "lucide-react";
import { useTutorial } from "@/hooks/useTutorial";
import { useUIState } from "@/store/useWorkflowStore";
import { useIsMobile } from "@/hooks/useBreakpoint";
import WelcomeStep from "./steps/WelcomeStep";
import NodeTypesStep from "./steps/NodeTypesStep";
import BuildWorkflowStep from "./steps/BuildWorkflowStep";
import ConfigureNodesStep from "./steps/ConfigureNodesStep";
import RunEstimateStep from "./steps/RunEstimateStep";
import ImportExportTab from "./tabs/ImportExportTab";
import SaveManageTab from "./tabs/SaveManageTab";
import EstimationTab from "./tabs/EstimationTab";
import CanvasGuideTab from "./tabs/CanvasGuideTab";
import TipsTab from "./tabs/TipsTab";
import ShortcutsTab from "./tabs/ShortcutsTab";

// ── Walkthrough steps ───────────────────────────────────────
const STEPS = [
  {
    title: "Welcome to Neurovn",
    description:
      "A visual canvas for designing and cost-estimating AI agent workflows. Build node graphs, connect them, then get instant token and cost breakdowns.",
    Component: WelcomeStep,
  },
  {
    title: "Meet the Building Blocks",
    description:
      "Every workflow is built from these nodes. Each has a distinct shape and colour.",
    Component: NodeTypesStep,
  },
  {
    title: "Build Your Workflow",
    description:
      "Drag nodes from the sidebar, drop onto the canvas, then connect them by pulling between handles.",
    Component: BuildWorkflowStep,
  },
  {
    title: "Configure Your Nodes",
    description:
      "Click any node to select it. Click again to open its configuration panel -- assign models, tools, conditions, and probabilities.",
    Component: ConfigureNodesStep,
  },
  {
    title: "Estimate Costs and Latency",
    description:
      'Click "Run Workflow & Gen Estimate" to get a full cost report -- tokens, cost, latency, critical path, and per-node breakdown.',
    Component: RunEstimateStep,
  },
];

const TOTAL_STEPS = STEPS.length;

// ── Reference tabs ──────────────────────────────────────────
interface TabDef {
  key: string;
  label: string;
  icon: React.ElementType;
  Component: React.ComponentType<{ isDark: boolean }>;
}

const TABS: TabDef[] = [
  { key: "import-export", label: "Import & Export", icon: Download, Component: ImportExportTab },
  { key: "save-manage", label: "Save & Manage", icon: Save, Component: SaveManageTab },
  { key: "estimation", label: "Estimation", icon: BarChart3, Component: EstimationTab },
  { key: "canvas-guide", label: "Canvas Guide", icon: Paintbrush, Component: CanvasGuideTab },
  { key: "shortcuts", label: "Shortcuts", icon: Keyboard, Component: ShortcutsTab },
  { key: "tips", label: "Tips", icon: Lightbulb, Component: TipsTab },
];

export default function CanvasTutorialModal() {
  const { isOpen, currentStep, next, back, finish, skip } = useTutorial();
  const { theme } = useUIState();
  const isMobile = useIsMobile();
  const isDark = theme === "dark";
  const directionRef = useRef(1);

  // "walkthrough" or a tab key
  const [activeView, setActiveView] = useState<string>("walkthrough");

  // Reset to walkthrough when modal opens
  useEffect(() => {
    if (isOpen) setActiveView("walkthrough");
  }, [isOpen]);

  const isWalkthrough = activeView === "walkthrough";
  const isFirst = currentStep === 0;
  const isLast = currentStep === TOTAL_STEPS - 1;

  const handleNext = useCallback(() => {
    directionRef.current = 1;
    if (isLast) {
      finish();
    } else {
      next();
    }
  }, [isLast, finish, next]);

  const handleBack = useCallback(() => {
    directionRef.current = -1;
    back();
  }, [back]);

  // Keyboard navigation (only in walkthrough mode)
  useEffect(() => {
    if (!isOpen) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        skip();
      } else if (isWalkthrough && e.key === "ArrowRight") {
        handleNext();
      } else if (isWalkthrough && e.key === "ArrowLeft" && !isFirst) {
        handleBack();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, isWalkthrough, isFirst, handleNext, handleBack, skip]);

  if (!isOpen) return null;

  const activeTab = TABS.find((t) => t.key === activeView);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={skip} aria-hidden />

      <motion.div
        className={`relative z-10 w-full max-w-4xl max-sm:max-w-[95vw] rounded-2xl border shadow-2xl overflow-hidden flex flex-col ${isDark ? "border-slate-700 bg-slate-900" : "border-gray-200 bg-white"
          }`}
        style={{ maxHeight: "85vh" }}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Tab bar ──────────────────────────────────────── */}
        <div className={`flex items-center border-b shrink-0 relative ${isDark ? "border-slate-700" : "border-gray-200"}`}>
          {/* Walkthrough tab */}
          <button
            onClick={() => setActiveView("walkthrough")}
            className={`relative flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition whitespace-nowrap ${isWalkthrough
              ? isDark ? "text-blue-400" : "text-blue-600"
              : isDark ? "text-slate-400 hover:text-slate-200" : "text-gray-500 hover:text-gray-700"
              }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Getting Started
            {isWalkthrough && (
              <motion.div
                layoutId="help-tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
          </button>

          <div className={`w-px h-5 mx-1 ${isDark ? "bg-slate-700" : "bg-gray-200"}`} />

          {/* Reference tabs */}
          <div className="flex items-center max-sm:overflow-x-auto max-sm:pb-0.5 scrolling-touch custom-scrollbar-hide">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveView(tab.key)}
                className={`relative flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium transition whitespace-nowrap ${activeView === tab.key
                  ? isDark ? "text-blue-400" : "text-blue-600"
                  : isDark ? "text-slate-500 hover:text-slate-300" : "text-gray-400 hover:text-gray-600"
                  }`}
              >
                <tab.icon className="w-3 h-3" />
                {tab.label}
                {activeView === tab.key && (
                  <motion.div
                    layoutId="help-tab-indicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </button>
            ))}
          </div>

          <button
            onClick={skip}
            className={`ml-auto mr-2 p-2 rounded-full transition-all ${isDark ? "hover:bg-slate-800 text-slate-500 hover:text-slate-200" : "hover:bg-gray-100 text-gray-400 hover:text-gray-600"
              }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Body ─────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {isWalkthrough ? (
            <motion.div
              key="walkthrough"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col flex-1 min-h-0"
            >
              {/* Illustration */}
              <div
                className={`relative border-b shrink-0 ${isDark ? "border-slate-700 bg-slate-800/50" : "border-gray-100 bg-gray-50"
                  }`}
                style={{ height: isMobile ? 180 : 260 }}
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentStep}
                    className="absolute inset-0 p-4"
                    initial={{ opacity: 0, x: directionRef.current * 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: directionRef.current * -40 }}
                    transition={{ duration: 0.25 }}
                  >
                    {React.createElement(STEPS[currentStep].Component, { isDark })}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Title + description */}
              <div className="px-6 pt-4 pb-2">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                  >
                    <h2 className={`text-lg font-bold mb-1 ${isDark ? "text-slate-100" : "text-gray-900"}`}>
                      {STEPS[currentStep].title}
                    </h2>
                    <p className={`text-sm leading-relaxed ${isDark ? "text-slate-400" : "text-gray-600"}`}>
                      {STEPS[currentStep].description}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Footer: dots + nav */}
              <div className="flex items-center justify-between px-6 py-3 mt-auto shrink-0">
                <div className="flex items-center gap-1.5">
                  {STEPS.map((_, i) => (
                    <div
                      key={i}
                      className={`w-2 h-2 rounded-full transition-all duration-300 ${i === currentStep
                        ? "bg-blue-500 scale-110"
                        : i < currentStep
                          ? isDark ? "bg-blue-500/40" : "bg-blue-300"
                          : isDark ? "bg-slate-600" : "bg-gray-300"
                        }`}
                    />
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  {!isFirst && (
                    <button
                      onClick={handleBack}
                      className={`rounded-md border px-4 py-1.5 text-sm font-medium transition ${isDark
                        ? "border-slate-600 text-slate-300 hover:bg-slate-700"
                        : "border-gray-300 text-gray-600 hover:bg-gray-100"
                        }`}
                    >
                      Back
                    </button>
                  )}
                  <button
                    onClick={handleNext}
                    className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 transition"
                  >
                    {isLast ? "Start Building" : "Next"}
                  </button>
                </div>
              </div>
            </motion.div>
          ) : activeTab ? (
            <motion.div
              key={activeTab.key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex-1 min-h-0 px-5 py-4"
            >
              <activeTab.Component isDark={isDark} />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
