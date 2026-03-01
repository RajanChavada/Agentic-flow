"use client";

import { useEffect, useRef } from "react";
import { useWorkflowStore, useWorkflowNodes, useWorkflowEdges } from "@/store/useWorkflowStore";
import { useUser } from "@/store/useAuthStore";

const DEBOUNCE_MS = 3000;

/**
 * Watches nodes + edges in Zustand and auto-saves to Supabase
 * when the user is authenticated and has an active workflow.
 * Debounced to avoid hammering the DB on every drag/connect.
 */
export function useAutoSave() {
  const nodes = useWorkflowNodes();
  const edges = useWorkflowEdges();
  const user = useUser();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialMount = useRef(true);

  useEffect(() => {
    // Skip the initial mount to avoid saving the hydrated/empty state
    if (initialMount.current) {
      initialMount.current = false;
      return;
    }

    if (!user) return;

    const store = useWorkflowStore.getState();
    const activeId = store.activeWorkflowId;

    // Only auto-save when we have an active workflow (user has saved at least once)
    if (!activeId) return;

    // Don't save if there are no meaningful nodes
    if (nodes.length === 0) return;

    // Debounce
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const current = useWorkflowStore.getState();
      const scenario = current.scenarios[activeId];
      const name = scenario?.name ?? "Auto-saved workflow";
      current.saveWorkflowToSupabase(name);
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [nodes, edges, user]);
}
