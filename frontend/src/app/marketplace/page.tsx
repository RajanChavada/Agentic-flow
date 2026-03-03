"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, LayoutTemplate } from "lucide-react";
import TemplateGrid from "@/components/marketplace/TemplateGrid";
import { useWorkflowStore } from "@/store/useWorkflowStore";
import { useUIState } from "@/store/useWorkflowStore";
import { useAuthStore, useUser } from "@/store/useAuthStore";
import NavProfile from "@/components/NavProfile";

export default function MarketplacePage() {
  const user = useUser();
  const router = useRouter();
  const loadTemplateOntoCanvas = useWorkflowStore((s) => s.loadTemplateOntoCanvas);
  const { theme } = useUIState();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  useEffect(() => {
    useAuthStore.getState().init();
  }, []);

  const handleUseTemplate = async (id: string) => {
    setLoadingId(id);
    try {
      await loadTemplateOntoCanvas(id);
      router.push("/editor/guest");
    } catch (err) {
      console.error("Failed to load template:", err);
      setLoadingId(null);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Link>
            <Link href="/canvases" className="flex items-center gap-2 font-semibold text-foreground">
              <LayoutTemplate className="w-5 h-5" />
              Neurovn
            </Link>
            <NavProfile />
          </div>
          <div className="w-20" />
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
            Workflow Templates
          </h1>
          <p className="mt-2 text-muted-foreground">
            Start from a proven design. Browse templates, use one on your canvas, or publish your own.
          </p>
        </div>

        <TemplateGrid
          onUseTemplate={handleUseTemplate}
          loadingId={loadingId}
          currentUserId={user?.id ?? null}
        />
      </div>
    </main>
  );
}
