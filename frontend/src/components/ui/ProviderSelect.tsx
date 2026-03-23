import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, AlertTriangle } from "lucide-react";
import { ProviderIcon } from "@/lib/providerIcons";

export interface ProviderItem {
  id: string;
  name: string;
  last_updated?: string;
  modelsCount?: number;
}

interface ProviderSelectProps {
  providers: ProviderItem[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  isLoading?: boolean;
  isDark?: boolean;
  onRequestModel?: () => void;
}

const TIER_1_IDS = ["OpenAI", "Anthropic", "Google", "Meta"];

function isProviderPricingStale(isoDate?: string) {
  if (!isoDate) return true;
  const parsed = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return true;
  const daysOld = (Date.now() - parsed.getTime()) / (1000 * 60 * 60 * 24);
  return daysOld > 30;
}

function fmtProviderUpdated(isoDate?: string) {
  if (!isoDate) return "unknown";
  const parsed = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return parsed.toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

export function ProviderSelect({
  providers,
  value,
  onChange,
  disabled,
  isLoading,
  isDark,
  onRequestModel,
}: ProviderSelectProps) {
  const [open, setOpen] = useState(false);
  const [showTier2, setShowTier2] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const tier1 = providers.filter((p) => TIER_1_IDS.includes(p.id));
  const tier2 = providers.filter((p) => !TIER_1_IDS.includes(p.id));

  // If the user previously selected a Tier 2 provider, we should keep Tier 2 expanded for the session
  useEffect(() => {
    if (value && tier2.some((p) => p.id === value)) {
      setShowTier2(true);
    }
  }, [value, tier2]);

  const selectedProvider = providers.find((p) => p.id === value);

  return (
    <div className="relative w-full" ref={ref}>
      <button
        type="button"
        disabled={disabled || isLoading}
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between rounded border px-3 py-2 text-sm text-left ${
          isDark
            ? "bg-slate-700 border-slate-500 text-slate-100"
            : "bg-white border-gray-300 text-gray-800"
        } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <span className="truncate">
          {isLoading ? (
            "Loading providers…"
          ) : selectedProvider ? (
            <span className="flex items-center gap-2">
              <ProviderIcon provider={selectedProvider.id} size={16} className="shrink-0" />
              <div className="flex items-center gap-1.5 truncate">
                {isProviderPricingStale(selectedProvider.last_updated) && (
                  <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />
                )}
                {selectedProvider.name}
              </div>
            </span>
          ) : (
            "— select provider —"
          )}
        </span>
        <ChevronDown className="w-4 h-4 opacity-50 shrink-0 ml-2" />
      </button>

      {open && (
        <div
          className={`absolute z-[100] mt-1 w-full rounded-md border shadow-lg overflow-y-auto max-h-72 ${
            isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"
          }`}
        >
          <ul className="py-1 flex flex-col">
            {/* TIER 1 */}
            {tier1.map((p) => {
              const stale = isProviderPricingStale(p.last_updated);
              return (
                <li
                  key={p.id}
                  onClick={() => {
                    onChange(p.id);
                    setOpen(false);
                  }}
                  className={`px-3 py-2 text-sm cursor-pointer flex flex-col ${
                    isDark ? "hover:bg-slate-700 text-slate-200" : "hover:bg-gray-100 text-gray-800"
                  } ${value === p.id ? (isDark ? "bg-slate-700" : "bg-gray-100") : ""}`}
                >
                  <div className="flex items-center gap-2">
                    <ProviderIcon provider={p.id} size={18} className="shrink-0" />
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        {stale && <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 shrink-0" />}
                        <span className="font-medium truncate">{p.name}</span>
                      </div>
                      <div className={`text-[10px] mt-0.5 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                        {p.modelsCount ?? 0} models · updated {fmtProviderUpdated(p.last_updated)}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}

            {/* TIER 2 Expander */}
            {tier2.length > 0 && !showTier2 && (
              <li
                onClick={(e) => {
                  e.stopPropagation();
                  setShowTier2(true);
                }}
                className={`px-3 py-2 text-sm cursor-pointer font-medium border-t ${
                  isDark
                    ? "border-slate-700 text-blue-400 hover:bg-slate-700/50"
                    : "border-gray-100 text-blue-600 hover:bg-blue-50/50"
                }`}
              >
                + See more providers ({tier2.length})
              </li>
            )}

            {/* TIER 2 List */}
            {showTier2 && tier2.length > 0 && (
              <div className={`border-t ${isDark ? "border-slate-700" : "border-gray-100"}`}>
                {tier2.map((p) => {
                  const stale = isProviderPricingStale(p.last_updated);
                  return (
                    <li
                      key={p.id}
                      onClick={() => {
                        onChange(p.id);
                        setOpen(false);
                      }}
                      className={`px-3 py-2 text-sm cursor-pointer flex flex-col ${
                        isDark ? "hover:bg-slate-700 text-slate-200" : "hover:bg-gray-100 text-gray-800"
                      } ${value === p.id ? (isDark ? "bg-slate-700" : "bg-gray-100") : ""}`}
                    >
                      <div className="flex items-center gap-2">
                        <ProviderIcon provider={p.id} size={16} className="shrink-0" />
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1.5">
                            {stale && <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 shrink-0" />}
                            <span className="font-medium truncate">{p.name}</span>
                          </div>
                          <div className={`text-[10px] mt-0.5 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                            {p.modelsCount ?? 0} models · updated {fmtProviderUpdated(p.last_updated)}
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </div>
            )}

            {/* REQUEST A MODEL */}
            {onRequestModel && (
              <li
                onClick={() => {
                  setOpen(false);
                  onRequestModel();
                }}
                className={`px-3 py-2 text-sm cursor-pointer font-medium border-t ${
                  isDark
                    ? "border-slate-700 text-purple-400 hover:bg-slate-700/50"
                    : "border-gray-100 text-purple-600 hover:bg-purple-50/50"
                }`}
              >
                + Request a model &rarr;
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
