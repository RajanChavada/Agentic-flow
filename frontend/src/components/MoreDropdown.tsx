"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { MoreHorizontal, type LucideIcon } from "lucide-react";

export type MoreDropdownItem =
  | { section: string }
  | {
      label: string;
      icon?: LucideIcon;
      onClick?: () => void;
      disabled?: boolean;
      component?: ReactNode;
    };

export default function MoreDropdown({
  isDark,
  items,
}: {
  isDark: boolean;
  items: MoreDropdownItem[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`rounded-full border px-2.5 py-1.5 text-sm font-medium transition flex items-center gap-1 ${
          isDark
            ? "border-slate-600 text-slate-300 hover:bg-slate-700"
            : "border-gray-200 text-gray-600 hover:bg-gray-50"
        }`}
        title="More actions"
      >
        <MoreHorizontal className="w-4 h-4" />
        <span className="hidden sm:inline text-xs">More</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className={`absolute right-0 top-full mt-1 z-50 min-w-56 rounded-xl border shadow-lg py-1 ${
              isDark ? "border-slate-700 bg-slate-900" : "border-gray-200 bg-white"
            }`}
          >
            {items.map((item, idx) => {
              if ("section" in item) {
                return (
                  <div
                    key={`${item.section}-${idx}`}
                    className={`px-3 pt-2 pb-1 text-xs font-semibold uppercase tracking-wide ${
                      isDark ? "text-slate-500" : "text-gray-400"
                    }`}
                  >
                    {item.section}
                  </div>
                );
              }

              if (item.component) {
                return (
                  <div key={`${item.label}-${idx}`} className="px-2 py-1">
                    {item.component}
                  </div>
                );
              }

              const Icon = item.icon;
              return (
                <button
                  key={`${item.label}-${idx}`}
                  onClick={() => {
                    item.onClick?.();
                    setOpen(false);
                  }}
                  disabled={item.disabled}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition disabled:opacity-40 ${
                    isDark ? "hover:bg-slate-800 text-slate-200" : "hover:bg-gray-50 text-gray-700"
                  }`}
                >
                  {Icon ? <Icon className="w-4 h-4 shrink-0" /> : null}
                  {item.label}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
