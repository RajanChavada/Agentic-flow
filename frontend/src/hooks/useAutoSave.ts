"use client";

import { useEffect, useRef } from "react";
import { useWorkflowStore, useWorkflowNodes, useWorkflowEdges } from "@/store/useWorkflowStore";
import { useUser } from "@/store/useAuthStore";

const DEBOUNCE_MS = 3000;

/**
 * Watches nodes + edges and auto-saves to Supabase when the user is
 * authenticated and has a currentWorkflowId (has saved at least once).
 * Debounced at 3s to avoid hammering the DB on every drag/connect.
 */
export function useAutoSave() {
  const nodes = useWorkflowNodes();
  const edges = useWorkflowEdges();
  const user = useUser();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialMount = useRef(true);

  useEffect(() => {
    if (initialMount.current) {
      initialMount.current = false;
      return;
    }

    if (!user) return;

    const store = useWorkflowStore.getState();
    if (!store.currentWorkflowId) return;
    if (nodes.length === 0) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const s = useWorkflowStore.getState();
      if (!s.currentWorkflowId || !s.isDirty) return;
      s.saveWorkflowToSupabase(s.currentWorkflowName);
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [nodes, edges, user]);
}
