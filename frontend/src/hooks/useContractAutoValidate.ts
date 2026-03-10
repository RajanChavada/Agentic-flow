"use client";

import { useEffect, useRef } from "react";
import { useWorkflowStore, useWorkflowNodes, useWorkflowEdges } from "@/store/useWorkflowStore";

const DEBOUNCE_MS = 2000;

/**
 * Watches node input/output schemas for changes and triggers contract
 * validation automatically after a 2-second debounce. Only fires when
 * there are edges and at least one node has a schema defined.
 */
export function useContractAutoValidate() {
  const nodes = useWorkflowNodes();
  const edges = useWorkflowEdges();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Build a fingerprint that changes only when schemas change
  const schemaFingerprint = nodes
    .map(
      (n) =>
        `${n.id}:${JSON.stringify(n.data.outputSchema ?? null)}:${JSON.stringify(n.data.inputSchema ?? null)}`
    )
    .join("|");

  useEffect(() => {
    const hasSchemas = nodes.some(
      (n) => n.data.outputSchema != null || n.data.inputSchema != null
    );
    if (!hasSchemas || edges.length === 0) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      void useWorkflowStore.getState().validateContracts();
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schemaFingerprint, edges.length]);
}
