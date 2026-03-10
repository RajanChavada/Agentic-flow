"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { X } from "lucide-react";

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
}

/**
 * Pre-built chip styles for 8-color palette.
 * Tailwind v4 cannot JIT-compile dynamic class strings,
 * so every combination is spelled out explicitly.
 */
const CHIP_STYLES = [
  {
    bg: "bg-sky-500/15",
    text: "text-sky-500",
    border: "border-sky-500/30",
    darkBg: "dark:bg-sky-500/20",
    darkText: "dark:text-sky-300",
  },
  {
    bg: "bg-emerald-500/15",
    text: "text-emerald-500",
    border: "border-emerald-500/30",
    darkBg: "dark:bg-emerald-500/20",
    darkText: "dark:text-emerald-300",
  },
  {
    bg: "bg-amber-500/15",
    text: "text-amber-500",
    border: "border-amber-500/30",
    darkBg: "dark:bg-amber-500/20",
    darkText: "dark:text-amber-300",
  },
  {
    bg: "bg-rose-500/15",
    text: "text-rose-500",
    border: "border-rose-500/30",
    darkBg: "dark:bg-rose-500/20",
    darkText: "dark:text-rose-300",
  },
  {
    bg: "bg-violet-500/15",
    text: "text-violet-500",
    border: "border-violet-500/30",
    darkBg: "dark:bg-violet-500/20",
    darkText: "dark:text-violet-300",
  },
  {
    bg: "bg-cyan-500/15",
    text: "text-cyan-500",
    border: "border-cyan-500/30",
    darkBg: "dark:bg-cyan-500/20",
    darkText: "dark:text-cyan-300",
  },
  {
    bg: "bg-orange-500/15",
    text: "text-orange-500",
    border: "border-orange-500/30",
    darkBg: "dark:bg-orange-500/20",
    darkText: "dark:text-orange-300",
  },
  {
    bg: "bg-lime-500/15",
    text: "text-lime-500",
    border: "border-lime-500/30",
    darkBg: "dark:bg-lime-500/20",
    darkText: "dark:text-lime-300",
  },
];

export default function TagInput({
  value,
  onChange,
  placeholder = "Type action, press Enter...",
  maxTags = 20,
}: TagInputProps) {
  const [input, setInput] = useState("");
  const [duplicateIndex, setDuplicateIndex] = useState<number | null>(null);
  const [animatingIndex, setAnimatingIndex] = useState<number | null>(null);
  const isBackspaceHeld = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Detect dark mode
  const isDark =
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("dark");

  // Clear animation states when they expire
  useEffect(() => {
    if (duplicateIndex !== null) {
      const timer = setTimeout(() => setDuplicateIndex(null), 300);
      return () => clearTimeout(timer);
    }
  }, [duplicateIndex]);

  useEffect(() => {
    if (animatingIndex !== null) {
      const timer = setTimeout(() => setAnimatingIndex(null), 150);
      return () => clearTimeout(timer);
    }
  }, [animatingIndex]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const trimmed = input.trim();
        if (!trimmed) return;
        if (value.length >= maxTags) return;

        // Check for duplicate (case-insensitive)
        const existingIdx = value.findIndex(
          (t) => t.toLowerCase() === trimmed.toLowerCase()
        );
        if (existingIdx !== -1) {
          setDuplicateIndex(existingIdx);
          return;
        }

        const newTags = [...value, trimmed];
        onChange(newTags);
        setInput("");
        setAnimatingIndex(newTags.length - 1);
      }

      if (e.key === "Backspace" && input === "" && value.length > 0) {
        // Anti-cascade: only act on fresh press
        if (isBackspaceHeld.current) {
          e.preventDefault();
          return;
        }
        isBackspaceHeld.current = true;
        const lastTag = value[value.length - 1];
        onChange(value.slice(0, -1));
        setInput(lastTag);
      }
    },
    [input, value, onChange, maxTags]
  );

  const handleKeyUp = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace") {
        isBackspaceHeld.current = false;
      }
    },
    []
  );

  const removeTag = useCallback(
    (index: number) => {
      onChange(value.filter((_, i) => i !== index));
    },
    [value, onChange]
  );

  const getChipStyle = (index: number) => {
    return CHIP_STYLES[index % CHIP_STYLES.length];
  };

  return (
    <div>
      {/* Container — looks like a single bordered input field */}
      <div
        className={`w-full rounded border px-2 py-1.5 cursor-text ${
          isDark
            ? "bg-slate-700 border-slate-500"
            : "bg-white border-gray-300"
        }`}
        onClick={() => inputRef.current?.focus()}
      >
        {/* Chips */}
        {value.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-1.5">
            {value.map((tag, i) => {
              const style = getChipStyle(i);
              const isPulsing = duplicateIndex === i;
              const isScaling = animatingIndex === i;

              return (
                <span
                  key={`${tag}-${i}`}
                  className={`
                    text-xs px-2 py-0.5 rounded-full inline-flex items-center gap-1
                    border transition-transform
                    ${style.bg} ${style.text} ${style.border}
                    ${style.darkBg} ${style.darkText}
                    ${isPulsing ? "animate-chip-pulse" : ""}
                    ${isScaling ? "animate-chip-in" : ""}
                  `}
                >
                  {tag}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeTag(i);
                    }}
                    className="opacity-60 hover:opacity-100 cursor-pointer p-1 -m-1"
                    aria-label={`Remove ${tag}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              );
            })}
          </div>
        )}

        {/* Text input */}
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          placeholder={value.length === 0 ? placeholder : "Add action..."}
          disabled={value.length >= maxTags}
          className={`w-full text-sm bg-transparent outline-none border-none p-0 ${
            isDark
              ? "text-slate-100 placeholder-slate-500"
              : "text-gray-800 placeholder-gray-400"
          }`}
        />
      </div>

      {/* Empty state helper text */}
      {value.length === 0 && input === "" && (
        <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
          Define allowed actions (e.g., approve, reject, escalate)
        </p>
      )}

      {/* Max tags indicator */}
      {value.length >= maxTags && (
        <p className="text-xs text-amber-500 dark:text-amber-400 mt-1">
          Maximum of {maxTags} actions reached
        </p>
      )}

      {/* Keyframe animations */}
      <style>{`
        @keyframes chip-in {
          from {
            transform: scale(0);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        @keyframes chip-pulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
            filter: brightness(1.2);
          }
        }
        .animate-chip-in {
          animation: chip-in 100ms ease-out;
        }
        .animate-chip-pulse {
          animation: chip-pulse 300ms ease-in-out;
        }
      `}</style>
    </div>
  );
}
