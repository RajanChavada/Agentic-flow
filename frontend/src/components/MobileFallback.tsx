"use client";

import React, { useEffect, useState } from "react";
import { useIsMobile } from "@/hooks/useBreakpoint";
import { Monitor } from "lucide-react";

export default function MobileFallback() {
  const isMobile = useIsMobile();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !isMobile) return null;

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-background/95 backdrop-blur-md p-6 text-center">
      <div className="bg-slate-100 dark:bg-slate-800 p-6 rounded-full mb-6">
        <Monitor className="w-12 h-12 text-blue-500" />
      </div>
      <h1 className="text-2xl font-bold mb-4">Desktop Required</h1>
      <p className="text-muted-foreground mb-8 max-w-sm leading-relaxed">
        The Neurovn workflow editor is packed with complex node rendering and canvas interactions that are optimized for larger screens. 
        <br /><br />
        Please switch to a desktop or tablet device to start building.
      </p>
      
      <button 
        onClick={() => window.history.back()}
        className="rounded-md border bg-background px-6 py-2.5 font-medium shadow-sm transition-colors hover:bg-muted"
      >
        Go Back
      </button>
    </div>
  );
}
