import { v4 as uuid } from 'uuid';
import type { Node, Edge } from '@xyflow/react';
import type { WorkflowNodeData, WorkflowNodeType } from '@/types/workflow';

export const SAMPLE_RAG_PIPELINE = {
  name: "Sample RAG Pipeline",
  nodes: [
    { id: "start", type: "startNode" as WorkflowNodeType, position: { x: 100, y: 150 }, data: { label: "Start", taskType: "general" } },
    { id: "research", type: "agentNode" as WorkflowNodeType, position: { x: 350, y: 150 }, data: { label: "Research Agent", modelProvider: "openai", modelName: "gpt-4o", taskType: "research" } },
    { id: "search", type: "toolNode" as WorkflowNodeType, position: { x: 600, y: 150 }, data: { label: "Web Search", toolId: "google_search" } },
    { id: "summarizer", type: "agentNode" as WorkflowNodeType, position: { x: 850, y: 150 }, data: { label: "Summarizer", modelProvider: "anthropic", modelName: "claude-3-5-sonnet", taskType: "summarization" } },
    { id: "finish", type: "finishNode" as WorkflowNodeType, position: { x: 1100, y: 150 }, data: { label: "Finish", taskType: "general" } }
  ] as Node<WorkflowNodeData>[],
  edges: [
    { id: "e1", source: "start", target: "research" },
    { id: "e2", source: "research", target: "search" },
    { id: "e3", source: "search", target: "summarizer" },
    { id: "e4", source: "summarizer", target: "finish" }
  ] as Edge[]
};
