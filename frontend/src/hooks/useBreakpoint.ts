"use client";

import { useState, useEffect } from "react";

type Breakpoint = "xs" | "sm" | "md" | "lg" | "xl";

const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
};

export function useBreakpoint(): Breakpoint {
  const [bp, setBp] = useState<Breakpoint>("lg"); // SSR-safe default

  useEffect(() => {
    function update() {
      const w = window.innerWidth;
      if (w >= BREAKPOINTS.xl) setBp("xl");
      else if (w >= BREAKPOINTS.lg) setBp("lg");
      else if (w >= BREAKPOINTS.md) setBp("md");
      else if (w >= BREAKPOINTS.sm) setBp("sm");
      else setBp("xs");
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return bp;
}

export function useIsMobile(): boolean {
  const bp = useBreakpoint();
  return bp === "xs" || bp === "sm";
}

export function useIsTablet(): boolean {
  const bp = useBreakpoint();
  return bp === "md";
}
