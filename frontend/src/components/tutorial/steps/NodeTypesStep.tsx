"use client";

import React from "react";
import { motion } from "framer-motion";
import { Play, Brain, Wrench, GitBranch, Flag, Target } from "lucide-react";

interface NodeCard {
  name: string;
  shape: "circle" | "rectangle" | "hexagon" | "diamond" | "octagon" | "pill";
  color: string;
  icon: React.ElementType;
  description: string;
}

const NODE_CARDS: NodeCard[] = [
  { name: "Start", shape: "circle", color: "#22c55e", icon: Play, description: "Entry point for your workflow" },
  { name: "Agent", shape: "rectangle", color: "#3b82f6", icon: Brain, description: "LLM call (GPT-4o, Claude, Gemini)" },
  { name: "Tool", shape: "hexagon", color: "#f97316", icon: Wrench, description: "External tool (search, DB, API)" },
  { name: "Condition", shape: "diamond", color: "#a855f7", icon: GitBranch, description: "If/else branch with probability" },
  { name: "Finish", shape: "octagon", color: "#ef4444", icon: Flag, description: "Exit point -- marks completion" },
  { name: "Ideal State", shape: "pill", color: "#14b8a6", icon: Target, description: "Success criteria for the workflow" },
];

function ShapeMockup({ shape, color }: { shape: string; color: string }) {
  const style = { backgroundColor: color };

  switch (shape) {
    case "circle":
      return <span className="inline-block w-5 h-5 rounded-full" style={style} />;
    case "rectangle":
      return <span className="inline-block w-5 h-5 rounded-sm" style={style} />;
    case "diamond":
      return <span className="inline-block w-4 h-4 rotate-45 rounded-[2px]" style={style} />;
    case "hexagon":
      return (
        <span
          className="inline-block w-5 h-5"
          style={{ ...style, clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)" }}
        />
      );
    case "octagon":
      return (
        <span
          className="inline-block w-5 h-5"
          style={{ ...style, clipPath: "polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)" }}
        />
      );
    case "pill":
      return <span className="inline-block w-6 h-3.5 rounded-full" style={style} />;
    default:
      return <span className="inline-block w-5 h-5 rounded" style={style} />;
  }
}

export default function NodeTypesStep({ isDark }: { isDark: boolean }) {
  return (
    <div className="flex flex-col items-center h-full px-4">
      <div className="grid grid-cols-2 gap-3 w-full max-w-lg">
        {NODE_CARDS.map((card, i) => (
          <motion.div
            key={card.name}
            className={`flex items-start gap-3 rounded-lg border p-3 ${
              isDark
                ? "border-slate-600 bg-slate-800/60"
                : "border-gray-200 bg-white"
            }`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.08 }}
          >
            <div className="mt-0.5 shrink-0">
              <ShapeMockup shape={card.shape} color={card.color} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <card.icon className="w-3.5 h-3.5 shrink-0" style={{ color: card.color }} />
                <span className={`text-sm font-semibold ${isDark ? "text-slate-100" : "text-gray-900"}`}>
                  {card.name}
                </span>
              </div>
              <p className={`text-[11px] leading-snug mt-0.5 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                {card.description}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.p
        className={`text-[11px] mt-3 ${isDark ? "text-slate-500" : "text-gray-400"}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        You can also add Group Boxes and Text Labels for organization.
      </motion.p>
    </div>
  );
}
