import React, { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, Search } from "lucide-react";

export interface ModelItem {
  id: string;
  display_name: string;
}

interface ModelSelectProps {
  models: ModelItem[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  isDark?: boolean;
}

export function ModelSelect({
  models,
  value,
  onChange,
  disabled,
  isDark,
}: ModelSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      // Auto focus search if it exists
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 50);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Reset search on close or open
  useEffect(() => {
    if (!open) setSearch("");
  }, [open]);

  const selectedModel = models.find((m) => m.id === value);
  const showSearch = models.length > 5;

  const filteredModels = useMemo(() => {
    if (!search.trim()) return models;
    const lower = search.toLowerCase();
    return models.filter((m) => m.display_name.toLowerCase().includes(lower));
  }, [models, search]);

  return (
    <div className="relative w-full" ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between rounded border px-3 py-2 text-sm text-left ${
          isDark
            ? "bg-slate-700 border-slate-500 text-slate-100"
            : "bg-white border-gray-300 text-gray-800"
        } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <span className="truncate">
          {selectedModel ? selectedModel.display_name : "— select model —"}
        </span>
        <ChevronDown className="w-4 h-4 opacity-50 shrink-0 ml-2" />
      </button>

      {open && (
        <div
          className={`absolute z-[100] mt-1 w-full rounded-md border shadow-lg overflow-hidden flex flex-col ${
            isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"
          }`}
        >
          {showSearch && (
            <div
              className={`p-2 border-b shrink-0 flex items-center gap-2 ${
                isDark ? "border-slate-700 bg-slate-800" : "border-gray-200 bg-gray-50"
              }`}
            >
              <Search className={`w-4 h-4 ${isDark ? "text-slate-500" : "text-gray-400"}`} />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search models..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`w-full bg-transparent text-sm outline-none ${
                  isDark ? "text-slate-200 placeholder-slate-500" : "text-gray-800 placeholder-gray-400"
                }`}
              />
            </div>
          )}
          
          <ul className="py-1 overflow-y-auto max-h-60">
            {filteredModels.length === 0 ? (
              <li
                className={`px-3 py-3 text-sm text-center italic ${
                  isDark ? "text-slate-500" : "text-gray-400"
                }`}
              >
                No models found.
              </li>
            ) : (
              filteredModels.map((m) => (
                <li
                  key={m.id}
                  onClick={() => {
                    onChange(m.id);
                    setOpen(false);
                  }}
                  className={`px-3 py-2 text-sm cursor-pointer ${
                    isDark ? "hover:bg-slate-700 text-slate-200" : "hover:bg-gray-100 text-gray-800"
                  } ${value === m.id ? (isDark ? "bg-slate-700" : "bg-gray-100") : ""}`}
                >
                  {m.display_name}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
