"use client";

import React from "react";
import { motion } from "framer-motion";
import { Play, Brain, Wrench, Flag } from "lucide-react";

export default function WelcomeStep({ isDark }: { isDark: boolean }) {
  // Mini-canvas mockup nodes
  const mockNodes = [
    { icon: Play, label: "Start", x: 40, y: 50, color: "#22c55e" },
    { icon: Brain, label: "Agent", x: 160, y: 30, color: "#3b82f6" },
    { icon: Wrench, label: "Tool", x: 160, y: 80, color: "#f97316" },
    { icon: Flag, label: "Finish", x: 290, y: 50, color: "#ef4444" },
  ];

  const connections = [
    { x1: 72, y1: 58, x2: 148, y2: 38 },
    { x1: 72, y1: 58, x2: 148, y2: 88 },
    { x1: 192, y1: 38, x2: 278, y2: 58 },
    { x1: 192, y1: 88, x2: 278, y2: 58 },
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full px-6">
      {/* Animated mini-canvas mockup */}
      <motion.div
        className={`relative w-[360px] h-[140px] rounded-xl border-2 border-dashed ${
          isDark ? "border-slate-600 bg-slate-800/50" : "border-gray-300 bg-gray-50"
        }`}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        {/* Connection lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {connections.map((c, i) => (
            <motion.line
              key={i}
              x1={c.x1}
              y1={c.y1}
              x2={c.x2}
              y2={c.y2}
              stroke={isDark ? "#475569" : "#d1d5db"}
              strokeWidth={2}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.6, delay: 0.5 + i * 0.15 }}
            />
          ))}
        </svg>

        {/* Mock nodes */}
        {mockNodes.map((node, i) => (
          <motion.div
            key={node.label}
            className={`absolute flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium shadow-sm ${
              isDark ? "bg-slate-700 text-slate-200" : "bg-white text-gray-700"
            }`}
            style={{ left: node.x, top: node.y, transform: "translate(-50%, -50%)" }}
            initial={{ opacity: 0, y: 12 }}
            animate={{
              opacity: 1,
              y: [0, -4, 0],
            }}
            transition={{
              opacity: { duration: 0.3, delay: 0.2 + i * 0.1 },
              y: { duration: 3, delay: 1 + i * 0.3, repeat: Infinity, ease: "easeInOut" },
            }}
          >
            <span
              className="inline-block w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: node.color }}
            />
            {node.label}
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
