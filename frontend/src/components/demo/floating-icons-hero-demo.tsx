"use client";

import React from "react";
import FloatingIconsHero from "@/components/ui/floating-icons-hero-section";
import type { FloatingIconsHeroProps } from "@/components/ui/floating-icons-hero-section";
import {
  Bot,
  Workflow,
  CircuitBoard,
  Network,
  Cpu,
  Zap,
  GitBranch,
  Layers,
} from "lucide-react";

const demoIcons: FloatingIconsHeroProps["icons"] = [
  { id: 1, icon: Bot, className: "top-[8%] left-[8%]" },
  { id: 2, icon: Workflow, className: "top-[14%] right-[12%]" },
  { id: 3, icon: CircuitBoard, className: "bottom-[18%] left-[12%]" },
  { id: 4, icon: Network, className: "top-[55%] left-[5%]" },
  { id: 5, icon: Cpu, className: "top-[10%] left-[40%]" },
  { id: 6, icon: Zap, className: "bottom-[12%] right-[10%]" },
  { id: 7, icon: GitBranch, className: "top-[40%] right-[6%]" },
  { id: 8, icon: Layers, className: "bottom-[30%] right-[30%]" },
];

export default function FloatingIconsHeroDemo() {
  return (
    <FloatingIconsHero
      title="Craft Intelligent Workflows."
      subtitle="The minimalist canvas for agentic AI. Visualize, estimate, and optimize — before you ship."
      ctaText="Launch Canvas"
      ctaHref="/editor"
      secondaryCtaText="Learn More"
      secondaryCtaHref="#features"
      icons={demoIcons}
    />
  );
}
