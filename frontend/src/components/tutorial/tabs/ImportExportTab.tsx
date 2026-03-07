"use client";

import React from "react";
import { motion } from "framer-motion";
import { Download, Upload, GitBranch, FileJson, Copy, ArrowRight } from "lucide-react";

interface GuideItem {
  icon: React.ElementType;
  title: string;
  description: string;
  color: string;
}

const IMPORT_ITEMS: GuideItem[] = [
  {
    icon: Download,
    title: "Import from JSON",
    description:
      'Click the "Import" button in the header bar to load a workflow from a JSON file. Supports Generic and LangGraph formats. The importer auto-detects the format and maps nodes/edges to the canvas.',
    color: "#8b5cf6",
  },
  {
    icon: GitBranch,
    title: "Pull from Another Canvas",
    description:
      'Use "Pull from canvas" to copy workflows from your other canvases into the current one. Select any saved workflow from the dropdown and import it with its full graph and estimation data.',
    color: "#6366f1",
  },
];

const EXPORT_ITEMS: GuideItem[] = [
  {
    icon: Upload,
    title: "Export Options",
    description:
      'Click the "Export" dropdown next to the Run button. You can export as JSON (for re-import or sharing), as PNG image (captures the full canvas), or copy the estimation report to clipboard.',
    color: "#ec4899",
  },
  {
    icon: FileJson,
    title: "JSON Format",
    description:
      "Exported JSON includes all nodes (type, position, config), edges (connections, handles), and estimation data. This file can be imported into any Neurovn canvas or processed programmatically.",
    color: "#f97316",
  },
  {
    icon: Copy,
    title: "Share Workflows",
    description:
      'Use the "Share" button to generate a shareable link for your workflow or entire canvas. Recipients can view the workflow without needing an account.',
    color: "#3b82f6",
  },
];

export default function ImportExportTab({ isDark }: { isDark: boolean }) {
  return (
    <div className="space-y-5 overflow-y-auto max-h-[420px] pr-1">
      {/* Import */}
      <div>
        <h3 className={`text-sm font-bold mb-3 flex items-center gap-2 ${isDark ? "text-slate-200" : "text-gray-800"}`}>
          <Download className="w-4 h-4" /> Importing Workflows
        </h3>
        <div className="space-y-2.5">
          {IMPORT_ITEMS.map((item, i) => (
            <motion.div
              key={item.title}
              className={`flex gap-3 rounded-lg border p-3 ${isDark ? "border-slate-700 bg-slate-800/50" : "border-gray-100 bg-gray-50"}`}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <item.icon className="w-4 h-4 mt-0.5 shrink-0" style={{ color: item.color }} />
              <div>
                <p className={`text-xs font-semibold mb-0.5 ${isDark ? "text-slate-100" : "text-gray-900"}`}>{item.title}</p>
                <p className={`text-[11px] leading-relaxed ${isDark ? "text-slate-400" : "text-gray-500"}`}>{item.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className={`border-t ${isDark ? "border-slate-700" : "border-gray-200"}`} />

      {/* Export */}
      <div>
        <h3 className={`text-sm font-bold mb-3 flex items-center gap-2 ${isDark ? "text-slate-200" : "text-gray-800"}`}>
          <Upload className="w-4 h-4" /> Exporting & Sharing
        </h3>
        <div className="space-y-2.5">
          {EXPORT_ITEMS.map((item, i) => (
            <motion.div
              key={item.title}
              className={`flex gap-3 rounded-lg border p-3 ${isDark ? "border-slate-700 bg-slate-800/50" : "border-gray-100 bg-gray-50"}`}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
            >
              <item.icon className="w-4 h-4 mt-0.5 shrink-0" style={{ color: item.color }} />
              <div>
                <p className={`text-xs font-semibold mb-0.5 ${isDark ? "text-slate-100" : "text-gray-900"}`}>{item.title}</p>
                <p className={`text-[11px] leading-relaxed ${isDark ? "text-slate-400" : "text-gray-500"}`}>{item.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Quick flow */}
      <motion.div
        className={`flex items-center gap-2 rounded-lg px-3 py-2 text-[11px] ${isDark ? "bg-blue-900/20 text-blue-300" : "bg-blue-50 text-blue-700"}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <ArrowRight className="w-3.5 h-3.5 shrink-0" />
        Tip: You can also drag-and-drop JSON files directly onto the canvas to import.
      </motion.div>
    </div>
  );
}
