"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// ── Boxes core ───────────────────────────────────────────────
function BoxesCore({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  const rows = 20;
  const cols = 20;

  const colours = useMemo(
    () => [
      "rgba(59,130,246,0.12)", // blue
      "rgba(16,185,129,0.12)", // emerald
      "rgba(245,158,11,0.12)", // amber
      "rgba(139,92,246,0.12)", // violet
      "rgba(236,72,153,0.12)", // pink
      "rgba(14,165,233,0.12)", // sky
    ],
    []
  );

  const getRandomColour = () =>
    colours[Math.floor(Math.random() * colours.length)];

  return (
    <div
      className={cn(
        "pointer-events-none absolute -top-1/4 left-1/4 z-0 flex h-[160%] w-full -translate-x-1/2 -skew-x-12 gap-px p-4",
        className
      )}
      style={{ transform: "translate(-40%,0) skewX(-48deg)" }}
      {...rest}
    >
      {Array.from({ length: cols }).map((_, colIdx) => (
        <div key={`col-${colIdx}`} className="flex flex-col gap-px">
          {Array.from({ length: rows }).map((_, rowIdx) => (
            <motion.div
              key={`cell-${colIdx}-${rowIdx}`}
              className="h-8 w-8 rounded-xs border border-gray-200/30 dark:border-slate-700/30 sm:h-10 sm:w-10"
              whileHover={{
                backgroundColor: getRandomColour(),
                transition: { duration: 0 },
              }}
              animate={{ transition: { duration: 2 } }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Public export ────────────────────────────────────────────
export function Boxes({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <BoxesCore className={className} {...props} />;
}

export default Boxes;
