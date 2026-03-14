"use client";

import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { ArrowRight, LayoutGrid } from "lucide-react";
import { listTemplates } from "@/lib/marketplacePersistence";
import { openTutorial } from "@/hooks/useTutorial";
import {
  useWorkflowStore,
  useUIState,
} from "@/store/useWorkflowStore";
import type { WorkflowTemplate } from "@/types/workflow";
import OverlayTemplateCard from "./OverlayTemplateCard";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const TUTORIAL_KEY = "neurovn-tutorial-completed";

const PLACEHOLDER_PROMPTS = [
  "Build a RAG pipeline for document Q&A...",
  "Create a research agent with web search...",
  "Design a classification workflow...",
  "Set up a multi-agent orchestration system...",
];

export default function BlankCanvasOverlay() {
  const router = useRouter();
  const { theme } = useUIState();
  const isDark = theme === "dark";
  const dismissBlankOverlay = useWorkflowStore((s) => s.dismissBlankOverlay);
  const loadTemplateOntoCanvas = useWorkflowStore((s) => s.loadTemplateOntoCanvas);

  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [isExiting, setIsExiting] = useState(false);

  // Fetch curated templates on mount
  useEffect(() => {
    let cancelled = false;
    listTemplates().then(({ templates: all }) => {
      if (cancelled) return;
      const curated = all.filter((t) => t.is_curated).slice(0, 8);
      setTemplates(curated.length > 0 ? curated : all.slice(0, 8));
    });
    return () => { cancelled = true; };
  }, []);

  const handleDismiss = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      dismissBlankOverlay();
      const tutorialDone = localStorage.getItem(TUTORIAL_KEY) === "true";
      if (!tutorialDone) {
        setTimeout(() => openTutorial(), 300);
      }
    }, 250);
  }, [dismissBlankOverlay]);

  const handleTemplateSelect = useCallback(
    async (id: string) => {
      setIsExiting(true);
      setTimeout(async () => {
        await loadTemplateOntoCanvas(id);
        dismissBlankOverlay();
      }, 200);
    },
    [loadTemplateOntoCanvas, dismissBlankOverlay]
  );

  const handleBrowseAll = useCallback(() => {
    router.push("/marketplace");
  }, [router]);

  return (
    <AnimatePresence>
      {!isExiting && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="absolute inset-0 z-50 flex items-center justify-center overflow-y-auto py-8"
        >
          {/* Backdrop gradient */}
          <div
            className={`absolute inset-0 ${isDark
                ? "bg-gradient-to-b from-slate-900/60 via-slate-900/80 to-slate-900/60"
                : "bg-gradient-to-b from-gray-50/60 via-gray-100/80 to-gray-50/60"
              }`}
          />

          {/* Content card */}
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.97 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className={`relative z-10 w-full max-w-2xl mx-4 rounded-xl border shadow-xl ${isDark
                ? "border-slate-700 bg-slate-900/95"
                : "border-gray-200 bg-white/95"
              } backdrop-blur-sm`}
          >
            <div className="p-6 sm:p-8">
              {/* Welcome heading */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.3 }}
                className="text-center mb-6"
              >
                <h2
                  className={`text-xl sm:text-2xl font-bold mb-2 ${isDark ? "text-slate-100" : "text-gray-900"
                    }`}
                >
                  Design your AI workflow
                </h2>
                <p
                  className={`text-sm ${isDark ? "text-slate-400" : "text-gray-500"
                    }`}
                >
                  Choose a template or start from scratch
                </p>
              </motion.div>

              {/* Template grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
                {templates.map((t, i) => (
                  <OverlayTemplateCard
                    key={t.id}
                    template={t}
                    isDark={isDark}
                    onSelect={handleTemplateSelect}
                    index={i}
                  />
                ))}
              </div>

              {/* Footer */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.3 }}
                className="flex items-center justify-between"
              >
                <button
                  onClick={handleBrowseAll}
                  className={`flex items-center gap-1.5 text-sm font-medium transition ${isDark
                      ? "text-slate-400 hover:text-blue-400"
                      : "text-gray-500 hover:text-blue-600"
                    }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  Browse all templates
                </button>
                <button
                  onClick={handleDismiss}
                  className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition ${isDark
                      ? "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200"
                    }`}
                >
                  Start from scratch
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
