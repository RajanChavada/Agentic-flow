"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
    BookOpen,
    Lightbulb,
    Rocket,
    Layers,
    Calculator,
    ChevronRight,
} from "lucide-react";

/* ── Section definitions ─────────────────────────────────── */
const sections = [
    {
        label: "Overview",
        href: "/docs",
        icon: BookOpen,
        description: "What is Neurovn?",
    },
    {
        label: "Core Concepts",
        href: "/docs/core-concepts",
        icon: Lightbulb,
        description: "Graphs, nodes, edges & more",
    },
    {
        label: "Quickstart",
        href: "/docs/quickstart",
        icon: Rocket,
        description: "First estimate in 15 min",
    },
    {
        label: "Node Palette",
        href: "/docs/nodes",
        icon: Layers,
        description: "All node types explained",
    },
    {
        label: "Pricing & Latency",
        href: "/docs/pricing",
        icon: Calculator,
        description: "How estimation works",
    },
] as const;

/* ── Component ───────────────────────────────────────────── */
export default function DocsSidebar({ onNavigate }: { onNavigate?: () => void }) {
    const pathname = usePathname();

    return (
        <nav className="flex flex-col gap-1" aria-label="Docs navigation">
            {/* Version badge */}
            <div className="mb-4 flex items-center gap-2 px-3">
                <span className="text-sm font-semibold tracking-tight text-foreground">
                    Documentation
                </span>
                <span className="rounded-full border border-border bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    v1.0
                </span>
            </div>

            {sections.map((s) => {
                const isActive =
                    s.href === "/docs"
                        ? pathname === "/docs"
                        : pathname.startsWith(s.href);
                const Icon = s.icon;

                return (
                    <Link
                        key={s.href}
                        href={s.href}
                        onClick={onNavigate}
                        className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${isActive
                                ? "bg-secondary text-foreground font-medium"
                                : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                            }`}
                    >
                        <Icon
                            className={`h-4 w-4 shrink-0 transition-colors ${isActive
                                    ? "text-foreground"
                                    : "text-muted-foreground group-hover:text-foreground"
                                }`}
                        />
                        <div className="flex flex-1 flex-col">
                            <span>{s.label}</span>
                            <span className="text-[11px] text-muted-foreground leading-tight">
                                {s.description}
                            </span>
                        </div>
                        <ChevronRight
                            className={`h-3.5 w-3.5 shrink-0 transition-all ${isActive
                                    ? "opacity-100 text-muted-foreground"
                                    : "opacity-0 group-hover:opacity-60"
                                }`}
                        />
                    </Link>
                );
            })}
        </nav>
    );
}
