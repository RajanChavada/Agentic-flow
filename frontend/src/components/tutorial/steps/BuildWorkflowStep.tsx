"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Play, Brain, Wrench, Flag } from "lucide-react";

const SUB_STEPS = [
  { key: "drag", label: "Drag from sidebar" },
  { key: "connect", label: "Connect nodes" },
  { key: "flow", label: "Build a flow" },
];

function DragIllustration({ isDark }: { isDark: boolean }) {
  return (
    <div className="relative flex items-center justify-center h-full">
      {/* Sidebar mock */}
      <div
        className={`absolute left-6 top-1/2 -translate-y-1/2 w-24 rounded-lg border p-2 ${
          isDark ? "border-slate-600 bg-slate-800" : "border-gray-200 bg-gray-50"
        }`}
      >
        {["Start", "Agent", "Tool"].map((label) => (
          <div
            key={label}
            className={`rounded px-2 py-1 text-[10px] mb-1 last:mb-0 ${
              isDark ? "bg-slate-700 text-slate-300" : "bg-white text-gray-600"
            }`}
          >
            {label}
          </div>
        ))}
      </div>

      {/* Canvas area */}
      <div
        className={`absolute right-6 top-1/2 -translate-y-1/2 w-40 h-24 rounded-lg border-2 border-dashed flex items-center justify-center ${
          isDark ? "border-slate-600" : "border-gray-300"
        }`}
      >
        <motion.div
          className={`rounded-lg border px-3 py-1.5 text-xs font-medium shadow-sm ${
            isDark ? "bg-blue-900/40 border-blue-500 text-blue-200" : "bg-blue-50 border-blue-400 text-blue-800"
          }`}
          initial={{ x: -80, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
        >
          Agent
        </motion.div>
      </div>

      {/* Animated arrow from sidebar to canvas */}
      <motion.div
        className="absolute top-1/2 -translate-y-1/2"
        style={{ left: 140 }}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: [0, 1, 1, 0], x: [-10, 0, 20, 30] }}
        transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
      >
        <ArrowRight className={`w-5 h-5 ${isDark ? "text-slate-500" : "text-gray-400"}`} />
      </motion.div>
    </div>
  );
}

function ConnectIllustration({ isDark }: { isDark: boolean }) {
  return (
    <div className="relative flex items-center justify-center h-full">
      {/* Two nodes */}
      <div className="flex items-center gap-20">
        <motion.div
          className={`rounded-lg border px-4 py-2 text-xs font-medium shadow-sm ${
            isDark ? "bg-green-900/40 border-green-500 text-green-200" : "bg-green-50 border-green-400 text-green-800"
          }`}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Play className="inline w-3 h-3 mr-1" /> Start
        </motion.div>

        <motion.div
          className={`rounded-lg border px-4 py-2 text-xs font-medium shadow-sm ${
            isDark ? "bg-blue-900/40 border-blue-500 text-blue-200" : "bg-blue-50 border-blue-400 text-blue-800"
          }`}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Brain className="inline w-3 h-3 mr-1" /> Agent
        </motion.div>
      </div>

      {/* Animated connection line */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <motion.line
          x1="42%"
          y1="50%"
          x2="58%"
          y2="50%"
          stroke={isDark ? "#64748b" : "#9ca3af"}
          strokeWidth={2}
          markerEnd="url(#arrowhead)"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        />
        <defs>
          <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill={isDark ? "#64748b" : "#9ca3af"} />
          </marker>
        </defs>
      </svg>
    </div>
  );
}

function FlowIllustration({ isDark }: { isDark: boolean }) {
  const nodes = [
    { icon: Play, label: "Start", color: "#22c55e", x: 50 },
    { icon: Brain, label: "Agent", color: "#3b82f6", x: 140 },
    { icon: Wrench, label: "Tool", color: "#f97316", x: 230 },
    { icon: Flag, label: "Finish", color: "#ef4444", x: 320 },
  ];

  return (
    <div className="relative flex items-center justify-center h-full">
      {/* Nodes */}
      {nodes.map((node, i) => (
        <motion.div
          key={node.label}
          className={`absolute flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium shadow-sm ${
            isDark ? "bg-slate-700 text-slate-200" : "bg-white text-gray-700"
          }`}
          style={{ left: node.x, top: "50%", transform: "translate(-50%, -50%)" }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: i * 0.15 }}
        >
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: node.color }} />
          {node.label}
        </motion.div>
      ))}

      {/* Arrows between nodes */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        {[0, 1, 2].map((i) => (
          <motion.line
            key={i}
            x1={nodes[i].x + 28}
            y1="50%"
            x2={nodes[i + 1].x - 28}
            y2="50%"
            stroke={isDark ? "#64748b" : "#9ca3af"}
            strokeWidth={2}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5, delay: 0.5 + i * 0.2 }}
          />
        ))}
      </svg>
    </div>
  );
}

export default function BuildWorkflowStep({ isDark }: { isDark: boolean }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActive((p) => (p + 1) % 3);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  const illustrations = [
    <DragIllustration key="drag" isDark={isDark} />,
    <ConnectIllustration key="connect" isDark={isDark} />,
    <FlowIllustration key="flow" isDark={isDark} />,
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Illustration area */}
      <div className="flex-1 relative min-h-[180px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            className="absolute inset-0"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
          >
            {illustrations[active]}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Sub-step indicators */}
      <div className="flex justify-center gap-4 pb-2">
        {SUB_STEPS.map((step, i) => (
          <button
            key={step.key}
            onClick={() => setActive(i)}
            className={`text-[10px] px-2.5 py-1 rounded-full transition ${
              i === active
                ? isDark
                  ? "bg-blue-500/20 text-blue-300 font-semibold"
                  : "bg-blue-100 text-blue-700 font-semibold"
                : isDark
                ? "text-slate-500 hover:text-slate-400"
                : "text-gray-400 hover:text-gray-500"
            }`}
          >
            {step.label}
          </button>
        ))}
      </div>
    </div>
  );
}
