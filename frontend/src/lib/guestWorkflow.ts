import type { Node, Edge } from "@xyflow/react";

const KEY = "guest_workflow";

export interface GuestWorkflowSnapshot {
    nodes: Node[];
    edges: Edge[];
    savedAt: number; // unix ms
}

export function saveGuestWorkflow(nodes: Node[], edges: Edge[]) {
    if (typeof window === "undefined") return;
    const snapshot: GuestWorkflowSnapshot = { nodes, edges, savedAt: Date.now() };
    localStorage.setItem(KEY, JSON.stringify(snapshot));
}

export function loadGuestWorkflow(): GuestWorkflowSnapshot | null {
    if (typeof window === "undefined") return null;
    try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return null;
        return JSON.parse(raw) as GuestWorkflowSnapshot;
    } catch {
        return null;
    }
}

export function clearGuestWorkflow() {
    if (typeof window === "undefined") return;
    localStorage.removeItem(KEY);
}
