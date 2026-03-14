"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Menu, X } from "lucide-react";
import DocsSidebar from "@/components/docs/DocsSidebar";

export default function DocsLayout({ children }: { children: React.ReactNode }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="min-h-screen bg-background text-foreground">
            {/* ── Top bar ──────────────────────────────────────── */}
            <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-lg">
                <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 sm:px-6">
                    {/* Back to main site */}
                    <Link
                        href="/"
                        className="flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
                    >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-foreground text-[9px] font-bold text-background">
                            NV
                        </div>
                        <span className="hidden font-semibold tracking-tight text-foreground sm:inline">
                            Neurovn
                        </span>
                    </Link>

                    <div className="h-5 w-px bg-border/60" />

                    <span className="text-sm font-medium text-muted-foreground">Docs</span>

                    <div className="flex-1" />

                    <Link
                        href="/canvases"
                        className="hidden items-center gap-1.5 rounded-lg bg-foreground px-4 py-1.5 text-sm font-medium text-background transition hover:opacity-90 sm:inline-flex"
                    >
                        Launch Canvas
                    </Link>

                    {/* Mobile sidebar toggle */}
                    <button
                        onClick={() => setSidebarOpen((v) => !v)}
                        className="rounded-md p-1.5 transition hover:bg-muted/50 lg:hidden"
                        aria-label="Toggle docs navigation"
                    >
                        {sidebarOpen ? (
                            <X className="h-5 w-5" />
                        ) : (
                            <Menu className="h-5 w-5" />
                        )}
                    </button>
                </div>
            </header>

            <div className="mx-auto flex max-w-7xl">
                {/* ── Desktop sidebar ────────────────────────────── */}
                <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-64 shrink-0 overflow-y-auto border-r border-border/60 px-4 py-6 lg:block">
                    <DocsSidebar />
                </aside>

                {/* ── Mobile sidebar overlay ─────────────────────── */}
                {sidebarOpen && (
                    <>
                        <div
                            className="fixed inset-0 z-30 bg-foreground/20 backdrop-blur-sm lg:hidden"
                            onClick={() => setSidebarOpen(false)}
                        />
                        <aside className="fixed left-0 top-14 z-40 h-[calc(100vh-3.5rem)] w-72 overflow-y-auto border-r border-border/60 bg-background px-4 py-6 shadow-xl lg:hidden">
                            <DocsSidebar onNavigate={() => setSidebarOpen(false)} />
                        </aside>
                    </>
                )}

                {/* ── Content ────────────────────────────────────── */}
                <main className="min-w-0 flex-1 px-6 py-10 sm:px-10 lg:px-16">
                    <div className="mx-auto max-w-3xl">{children}</div>
                </main>
            </div>
        </div>
    );
}
