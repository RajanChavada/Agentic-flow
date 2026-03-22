import React from "react";
import { Keyboard } from "lucide-react";

export default function ShortcutsTab({ isDark }: { isDark: boolean }) {
  const shortcuts = [
    { action: "Undo", mac: "Cmd+Z", win: "Ctrl+Z" },
    { action: "Redo", mac: "Cmd+Shift+Z", win: "Ctrl+Shift+Z" },
    { action: "Delete selected node/edge", mac: "Backspace / Delete", win: "Backspace / Delete" },
    { action: "Select all", mac: "Cmd+A", win: "Ctrl+A" },
    { action: "Zoom to fit", mac: "Cmd+Shift+F", win: "Ctrl+Shift+F" },
    { action: "Save", mac: "Cmd+S", win: "Ctrl+S" },
    { action: "New workflow", mac: "Cmd+N", win: "Ctrl+N" },
    { action: "Close config panel", mac: "Escape", win: "Escape" },
    { action: "Edit node label", mac: "Double-click label", win: "Double-click label" },
  ];

  return (
    <div className={`h-full overflow-y-auto pr-2 custom-scrollbar ${isDark ? "text-slate-300" : "text-gray-700"}`}>
      <div className="flex items-center gap-2 mb-4">
        <Keyboard className={`w-5 h-5 ${isDark ? "text-blue-400" : "text-blue-600"}`} />
        <h3 className={`text-lg font-semibold ${isDark ? "text-slate-100" : "text-gray-900"}`}>
          Keyboard Shortcuts
        </h3>
      </div>
      <p className="text-sm mb-6 max-w-2xl">
        Work faster with these canvas keyboard shortcuts.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className={`border-b ${isDark ? "border-slate-700 text-slate-400" : "border-gray-200 text-gray-500"}`}>
              <th className="py-3 px-4 font-medium">Action</th>
              <th className="py-3 px-4 font-medium">Mac</th>
              <th className="py-3 px-4 font-medium">Windows/Linux</th>
            </tr>
          </thead>
          <tbody>
            {shortcuts.map((s, i) => (
              <tr key={i} className={`border-b last:border-0 ${isDark ? "border-slate-800" : "border-gray-100"}`}>
                <td className="py-3 px-4">{s.action}</td>
                <td className="py-3 px-4">
                  <kbd className={`px-2 py-1 rounded text-xs font-mono inline-block ${isDark ? "bg-slate-800 text-slate-300 border border-slate-700" : "bg-gray-100 text-gray-700 border border-gray-200"}`}>{s.mac}</kbd>
                </td>
                <td className="py-3 px-4">
                  <kbd className={`px-2 py-1 rounded text-xs font-mono inline-block ${isDark ? "bg-slate-800 text-slate-300 border border-slate-700" : "bg-gray-100 text-gray-700 border border-gray-200"}`}>{s.win}</kbd>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
