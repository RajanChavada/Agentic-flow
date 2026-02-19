"use client";

import React, { useRef } from "react";
import {
  motion,
  useMotionValue,
  useMotionTemplate,
  useAnimationFrame,
} from "framer-motion";
import { cn } from "@/lib/utils";

/* ── SVG grid pattern (driven by motion values) ──────────── */
function GridPattern({
  offsetX,
  offsetY,
  size,
}: {
  offsetX: ReturnType<typeof useMotionValue<number>>;
  offsetY: ReturnType<typeof useMotionValue<number>>;
  size: number;
}) {
  return (
    <svg className="h-full w-full">
      <defs>
        <motion.pattern
          id="infinite-grid"
          width={size}
          height={size}
          patternUnits="userSpaceOnUse"
          x={offsetX}
          y={offsetY}
        >
          <path
            d={`M ${size} 0 L 0 0 0 ${size}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            className="text-muted-foreground"
          />
        </motion.pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#infinite-grid)" />
    </svg>
  );
}

/* ── Infinite Grid Background ────────────────────────────── */
export interface InfiniteGridProps {
  /** Content rendered on top of the grid */
  children?: React.ReactNode;
  className?: string;
  /** Grid cell size in px (default 44) */
  gridSize?: number;
  /** Flashlight reveal radius in px (default 280) */
  revealRadius?: number;
}

export default function InfiniteGrid({
  children,
  className,
  gridSize = 44,
  revealRadius = 280,
}: InfiniteGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Mouse tracking via motion values — zero React re-renders
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
  };

  // Infinite scroll offsets
  const gridOffsetX = useMotionValue(0);
  const gridOffsetY = useMotionValue(0);

  useAnimationFrame(() => {
    gridOffsetX.set((gridOffsetX.get() + 0.35) % gridSize);
    gridOffsetY.set((gridOffsetY.get() + 0.35) % gridSize);
  });

  // Radial "flashlight" mask that follows cursor
  const maskImage = useMotionTemplate`radial-gradient(${revealRadius}px circle at ${mouseX}px ${mouseY}px, black, transparent)`;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className={cn(
        "relative w-full overflow-hidden bg-background",
        className
      )}
    >
      {/* Layer 1 — subtle always-visible grid */}
      <div className="pointer-events-none absolute inset-0 z-0 opacity-[0.12]">
        <GridPattern
          offsetX={gridOffsetX}
          offsetY={gridOffsetY}
          size={gridSize}
        />
      </div>

      {/* Layer 2 — highlighted grid revealed by mouse */}
      <motion.div
        className="pointer-events-none absolute inset-0 z-0 opacity-30"
        style={{ maskImage, WebkitMaskImage: maskImage }}
      >
        <GridPattern
          offsetX={gridOffsetX}
          offsetY={gridOffsetY}
          size={gridSize}
        />
      </motion.div>

      {/* Content on top */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
