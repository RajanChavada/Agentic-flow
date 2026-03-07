"use client";

import React from "react";
import { motion } from "framer-motion";
import { MousePointerClick, ChevronDown, GitBranch } from "lucide-react";

export default function ConfigureNodesStep({ isDark }: { isDark: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 gap-5">
      {/* Click hint */}
      <motion.div
        className="flex items-center gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <MousePointerClick className={`w-5 h-5 ${isDark ? "text-blue-400" : "text-blue-500"}`} />
        <span className={`text-xs ${isDark ? "text-slate-400" : "text-gray-500"}`}>
          Click a node to select, click again to configure
        </span>
      </motion.div>

      {/* Mock config panel */}
      <motion.div
        className={`w-full max-w-sm rounded-xl border shadow-lg ${
          isDark ? "border-slate-600 bg-slate-800" : "border-gray-200 bg-white"
        }`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <div className={`px-4 py-3 border-b ${isDark ? "border-slate-700" : "border-gray-100"}`}>
          <span className={`text-sm font-semibold ${isDark ? "text-slate-100" : "text-gray-900"}`}>
            Node Configuration
          </span>
        </div>

        <div className="px-4 py-3 space-y-3">
          {/* Model dropdown mock */}
          <div>
            <label className={`block text-[11px] font-medium mb-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
              Model
            </label>
            <motion.div
              className={`flex items-center justify-between rounded-md border px-3 py-1.5 text-xs ${
                isDark
                  ? "border-blue-500 bg-blue-900/30 text-blue-200"
                  : "border-blue-400 bg-blue-50 text-blue-800"
              }`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <span className="font-medium">GPT-4o</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </motion.div>
          </div>

          {/* Condition expression mock */}
          <div>
            <label className={`block text-[11px] font-medium mb-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
              <GitBranch className="inline w-3 h-3 mr-1" />
              Condition Expression
            </label>
            <motion.div
              className={`rounded-md border px-3 py-1.5 text-xs ${
                isDark
                  ? "border-purple-500/50 bg-purple-900/20 text-purple-300"
                  : "border-purple-200 bg-purple-50 text-purple-700"
              }`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.65 }}
            >
              sentiment &gt; 0.7
            </motion.div>
          </div>

          {/* Probability slider mock */}
          <div>
            <label className={`block text-[11px] font-medium mb-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
              Branch Probability
            </label>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 rounded-full overflow-hidden bg-gray-200 dark:bg-slate-700">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-green-500 to-green-400"
                  initial={{ width: "0%" }}
                  animate={{ width: "70%" }}
                  transition={{ duration: 0.8, delay: 0.8 }}
                />
              </div>
              <div className="flex gap-2 text-[10px] font-medium">
                <motion.span
                  className={`px-1.5 py-0.5 rounded ${
                    isDark ? "bg-green-900/40 text-green-400" : "bg-green-100 text-green-700"
                  }`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.2 }}
                >
                  True 70%
                </motion.span>
                <motion.span
                  className={`px-1.5 py-0.5 rounded ${
                    isDark ? "bg-red-900/40 text-red-400" : "bg-red-100 text-red-700"
                  }`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.3 }}
                >
                  False 30%
                </motion.span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
