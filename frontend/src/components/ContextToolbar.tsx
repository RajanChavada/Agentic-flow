"use client";
"use no memo";

import React, { useState, useEffect } from "react";
import { Trash2, GitBranch, Target, CheckCircle2, Cpu, Wrench, Play, Flag } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Node } from "@xyflow/react";
import type {
  WorkflowNodeData,
  LabelPosition,
  BlankBoxStyle,
} from "@/types/workflow";
import {
  useWorkflowStore,
  useWorkflowNodes,
} from "@/store/useWorkflowStore";
import SchemaPanel from "./SchemaPanel";

/* ─── Shared primitives (inline) ──────────────────────────── */

function ToolbarDivider() {
  return <div className="w-px h-6 bg-stone-200 dark:bg-slate-700 mx-1.5 shrink-0" />;
}

function ToolbarInput({
  value,
  onChange,
  placeholder,
  className,
  maxLength,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  maxLength?: number;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      className={cn(
        "h-7 rounded border px-2 text-xs outline-none shrink-0",
        "bg-stone-50 border-stone-300 text-stone-800 placeholder:text-stone-400 focus:bg-white focus:ring-1 focus:ring-blue-400 focus:border-blue-400",
        "dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 dark:placeholder:text-slate-500",
        className
      )}
    />
  );
}

function ToolbarSelect({
  value,
  onChange,
  options,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "h-7 rounded border px-1.5 text-xs outline-none shrink-0 cursor-pointer",
        "bg-stone-50 border-stone-300 text-stone-800 focus:bg-white focus:ring-1 focus:ring-blue-400 focus:border-blue-400",
        "dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100",
        className
      )}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function ToolbarButtonGroup<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex rounded border border-stone-300 dark:border-slate-600 overflow-hidden shrink-0">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "px-2 h-7 text-[10px] font-medium transition-colors",
            value === o.value
              ? "bg-stone-800 text-white dark:bg-blue-500"
              : "bg-stone-50 text-stone-600 hover:bg-stone-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function ToolbarColorSwatch({
  color,
  active,
  onClick,
}: {
  color: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-4 h-4 rounded-full border-2 shrink-0 transition-all",
        active ? "border-stone-800 dark:border-blue-400 scale-125 ring-1 ring-stone-300 dark:ring-blue-400/30" : "border-stone-200 dark:border-slate-600 hover:scale-110"
      )}
      style={{ backgroundColor: color }}
    />
  );
}

const LABEL_POSITIONS: LabelPosition[] = [
  "top-left", "top-center", "top-right",
  "middle-left", "middle-center", "middle-right",
  "bottom-left", "bottom-center", "bottom-right",
];

function PositionPickerMini({
  value,
  onChange,
}: {
  value: LabelPosition;
  onChange: (v: LabelPosition) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-px shrink-0">
      {LABEL_POSITIONS.map((pos) => (
        <button
          key={pos}
          onClick={() => onChange(pos)}
          className={cn(
            "w-[7px] h-[7px] rounded-[1px] transition-colors",
            value === pos ? "bg-stone-800 dark:bg-blue-400" : "bg-stone-300 dark:bg-slate-600 hover:bg-stone-400 dark:hover:bg-slate-500"
          )}
        />
      ))}
    </div>
  );
}

function DeleteButton({ nodeId }: { nodeId: string }) {
  const deleteNode = useWorkflowStore((s) => s.deleteNode);
  return (
    <button
      onClick={() => deleteNode(nodeId)}
      className="ml-auto p-1.5 rounded text-stone-400 hover:text-red-600 hover:bg-red-50 dark:text-slate-500 dark:hover:text-red-400 dark:hover:bg-red-900/30 transition-colors shrink-0"
      title="Delete node"
    >
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  );
}

/* ─── Color presets (shared by BlankBox) ──────────────────── */

const COLOR_PRESETS = [
  { border: "#3b82f6", bg: "#eff6ff", label: "#3b82f6" },
  { border: "#10b981", bg: "#ecfdf5", label: "#10b981" },
  { border: "#f59e0b", bg: "#fffbeb", label: "#f59e0b" },
  { border: "#ef4444", bg: "#fef2f2", label: "#ef4444" },
  { border: "#8b5cf6", bg: "#f5f3ff", label: "#8b5cf6" },
  { border: "#ec4899", bg: "#fdf2f8", label: "#ec4899" },
  { border: "#6b7280", bg: "#f9fafb", label: "#6b7280" },
  { border: "#0ea5e9", bg: "#f0f9ff", label: "#0ea5e9" },
];

/* ─── BlankBox Section ────────────────────────────────────── */

function BlankBoxToolbarSection({ node }: { node: Node<WorkflowNodeData> }) {
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData);
  const bs = (node.data.blankBoxStyle ?? {}) as Partial<BlankBoxStyle>;

  const label = bs.label ?? "Group";
  const pos = bs.labelPosition ?? "top-left";
  const borderColor = bs.borderColor ?? "#3b82f6";
  const borderStyle = bs.borderStyle ?? "dashed";
  const borderWidth = bs.borderWidth ?? 2;
  const bgColor = bs.backgroundColor ?? "#eff6ff";
  const bgOpacity = bs.backgroundOpacity ?? 40;
  const labelBg = bs.labelBackground ?? "none";

  const update = (patch: Partial<BlankBoxStyle>) =>
    updateNodeData(node.id, { blankBoxStyle: { ...bs, ...patch } as BlankBoxStyle });

  return (
    <>
      <span className="inline-block w-3 h-3 rounded-[1px] border-2 border-stone-400 dark:border-slate-500 shrink-0" />
      <ToolbarInput
        value={label}
        onChange={(v) => update({ label: v })}
        className="w-20"
        placeholder="Label"
      />
      <ToolbarDivider />
      <PositionPickerMini value={pos} onChange={(v) => update({ labelPosition: v })} />
      <ToolbarDivider />
      <div className="flex items-center gap-1 shrink-0">
        {COLOR_PRESETS.map((c, i) => (
          <ToolbarColorSwatch
            key={i}
            color={c.border}
            active={borderColor === c.border}
            onClick={() =>
              update({
                borderColor: c.border,
                backgroundColor: c.bg,
                labelColor: c.label,
              })
            }
          />
        ))}
      </div>
      <input
        type="text"
        value={borderColor}
        onChange={(e) => update({ borderColor: e.target.value })}
        className={cn(
          "h-7 w-16 rounded border px-1 text-[10px] font-mono outline-none shrink-0",
          "bg-stone-50 border-stone-300 text-stone-700 focus:bg-white focus:ring-1 focus:ring-blue-400 focus:border-blue-400",
          "dark:bg-slate-800 dark:border-slate-600 dark:text-slate-300"
        )}
      />
      <ToolbarDivider />
      <ToolbarButtonGroup
        value={borderStyle}
        options={[
          { value: "solid" as const, label: "Solid" },
          { value: "dashed" as const, label: "Dash" },
          { value: "none" as const, label: "None" },
        ]}
        onChange={(v) => update({ borderStyle: v })}
      />
      <ToolbarButtonGroup
        value={String(borderWidth) as "1" | "2" | "3"}
        options={[
          { value: "1" as const, label: "1" },
          { value: "2" as const, label: "2" },
          { value: "3" as const, label: "3" },
        ]}
        onChange={(v) => update({ borderWidth: Number(v) as 1 | 2 | 3 })}
      />
      <ToolbarDivider />
      <input
        type="text"
        value={bgColor}
        onChange={(e) => update({ backgroundColor: e.target.value })}
        className={cn(
          "h-7 w-16 rounded border px-1 text-[10px] font-mono outline-none shrink-0",
          "bg-stone-50 border-stone-300 text-stone-700 focus:bg-white focus:ring-1 focus:ring-blue-400 focus:border-blue-400",
          "dark:bg-slate-800 dark:border-slate-600 dark:text-slate-300"
        )}
      />
      <input
        type="range"
        min={0}
        max={100}
        value={bgOpacity}
        onChange={(e) => update({ backgroundOpacity: Number(e.target.value) })}
        className="w-16 h-1 shrink-0 accent-blue-500"
      />
      <span className="text-[9px] text-stone-500 dark:text-slate-500 shrink-0">{bgOpacity}%</span>
      <ToolbarDivider />
      <ToolbarButtonGroup
        value={labelBg}
        options={[
          { value: "none" as const, label: "None" },
          { value: "pill" as const, label: "Pill" },
        ]}
        onChange={(v) => update({ labelBackground: v })}
      />
      <DeleteButton nodeId={node.id} />
    </>
  );
}

/* ─── Text Section ────────────────────────────────────────── */

function TextToolbarSection({ node }: { node: Node<WorkflowNodeData> }) {
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData);
  const ts = node.data.textNodeStyle as
    | { content: string; fontSize: string; color: string; background: string; backgroundColor?: string }
    | undefined;

  const content = ts?.content ?? "Text";
  const fontSize = (ts?.fontSize ?? "md") as "sm" | "md" | "lg" | "heading";
  const color = ts?.color ?? "#374151";
  const bg = (ts?.background ?? "none") as "none" | "pill" | "badge";

  const defaults = { content, fontSize, color, background: bg, backgroundColor: ts?.backgroundColor };
  const update = (patch: Record<string, unknown>) =>
    updateNodeData(node.id, { textNodeStyle: { ...defaults, ...patch } });

  return (
    <>
      <span className="inline-block text-sm font-bold text-stone-500 dark:text-slate-400 shrink-0">T</span>
      <ToolbarInput
        value={content}
        onChange={(v) => update({ content: v })}
        className="w-36"
        placeholder="Text content..."
      />
      <ToolbarDivider />
      <ToolbarButtonGroup
        value={fontSize}
        options={[
          { value: "sm" as const, label: "sm" },
          { value: "md" as const, label: "md" },
          { value: "lg" as const, label: "lg" },
          { value: "heading" as const, label: "H" },
        ]}
        onChange={(v) => update({ fontSize: v })}
      />
      <ToolbarDivider />
      <div
        className="w-4 h-4 rounded-full border border-stone-300 dark:border-slate-600 shrink-0"
        style={{ backgroundColor: color }}
      />
      <input
        type="text"
        value={color}
        onChange={(e) => update({ color: e.target.value })}
        className={cn(
          "h-7 w-16 rounded border px-1 text-[10px] font-mono outline-none shrink-0",
          "bg-stone-50 border-stone-300 text-stone-700 focus:bg-white focus:ring-1 focus:ring-blue-400 focus:border-blue-400",
          "dark:bg-slate-800 dark:border-slate-600 dark:text-slate-300"
        )}
      />
      <ToolbarDivider />
      <ToolbarButtonGroup
        value={bg}
        options={[
          { value: "none" as const, label: "None" },
          { value: "pill" as const, label: "Pill" },
          { value: "badge" as const, label: "Badge" },
        ]}
        onChange={(v) => update({ background: v })}
      />
      <DeleteButton nodeId={node.id} />
    </>
  );
}

/* ─── Condition Section ───────────────────────────────────── */

function ConditionToolbarSection({ node }: { node: Node<WorkflowNodeData> }) {
  const deleteNode = useWorkflowStore((s) => s.deleteNode);

  const conditionExpression = (node.data.conditionExpression as string | undefined) ?? "";
  const probability = (node.data.probability as number | undefined) ?? 50;

  // Truncate expression if too long
  const displayExpression = conditionExpression.length > 30
    ? conditionExpression.slice(0, 30) + "..."
    : conditionExpression || "No condition set";

  return (
    <>
      <GitBranch className="w-4 h-4 text-purple-500 dark:text-purple-400 shrink-0" />
      <span className="text-xs text-stone-600 dark:text-slate-300 shrink-0 max-w-48 truncate">
        {displayExpression}
      </span>
      <ToolbarDivider />
      <span className="text-xs font-semibold text-green-600 dark:text-green-400 shrink-0">
        {probability}%
      </span>
      <span className="text-xs text-stone-500 dark:text-slate-500 shrink-0">/</span>
      <span className="text-xs font-semibold text-red-600 dark:text-red-400 shrink-0">
        {100 - probability}%
      </span>
      <DeleteButton nodeId={node.id} />
    </>
  );
}

/* ─── Ideal State Section ─────────────────────────────────── */

function IdealStateToolbarSection({ node }: { node: Node<WorkflowNodeData> }) {
  const deleteNode = useWorkflowStore((s) => s.deleteNode);

  const description = (node.data.idealStateDescription as string | undefined) ?? "";
  const hasSchema = Boolean(node.data.idealStateSchema);

  const displayDescription = description.length > 40
    ? description.slice(0, 40) + "..."
    : description || "No description set";

  return (
    <>
      <Target className="w-4 h-4 text-teal-500 dark:text-teal-400 shrink-0" />
      <span className="text-xs text-stone-600 dark:text-slate-300 shrink-0 max-w-56 truncate">
        {displayDescription}
      </span>
      <ToolbarDivider />
      <span className={cn(
        "flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0",
        hasSchema
          ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
          : "bg-stone-100 text-stone-500 dark:bg-slate-700 dark:text-slate-400"
      )}>
        {hasSchema && <CheckCircle2 className="w-3 h-3" />}
        {hasSchema ? "Schema ready" : "No schema"}
      </span>
      <DeleteButton nodeId={node.id} />
    </>
  );
}

/* ─── Schema Status Button (shared) ──────────────────────── */

function SchemaStatusButton({
  label,
  schema,
  active,
  onClick,
}: {
  label: string;
  schema: Record<string, unknown> | null;
  active: boolean;
  onClick: () => void;
}) {
  const hasSchema = Boolean(schema);
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1 h-7 px-2 rounded text-[10px] font-medium transition-colors border shrink-0",
        active
          ? "bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-900/40 dark:border-blue-600 dark:text-blue-300"
          : hasSchema
            ? "bg-green-50 border-green-200 text-green-700 dark:bg-green-900/30 dark:border-green-700 dark:text-green-400"
            : "bg-stone-50 border-stone-200 text-stone-500 hover:bg-stone-100 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-700"
      )}
    >
      {hasSchema && <CheckCircle2 className="w-3 h-3" />}
      {label}
    </button>
  );
}

/* ─── Schema section props (shared) ──────────────────────── */

interface SchemaSectionProps {
  node: Node<WorkflowNodeData>;
  activePanel: { type: "output" | "input"; nodeId: string } | null;
  setActivePanel: (v: { type: "output" | "input"; nodeId: string } | null) => void;
}

/* ─── Agent Section ──────────────────────────────────────── */

function AgentToolbarSection({ node, activePanel, setActivePanel }: SchemaSectionProps) {
  const outputSchema = (node.data.outputSchema as Record<string, unknown> | null) ?? null;
  const inputSchema = (node.data.inputSchema as Record<string, unknown> | null) ?? null;

  return (
    <>
      <Cpu className="w-4 h-4 text-blue-500 dark:text-blue-400 shrink-0" />
      <span className="text-xs text-stone-600 dark:text-slate-300 shrink-0 max-w-32 truncate">
        {node.data.label}
      </span>
      <ToolbarDivider />
      <SchemaStatusButton
        label="Output"
        schema={outputSchema}
        active={activePanel?.type === "output" && activePanel.nodeId === node.id}
        onClick={() =>
          setActivePanel(
            activePanel?.type === "output" && activePanel.nodeId === node.id
              ? null
              : { type: "output", nodeId: node.id }
          )
        }
      />
      <SchemaStatusButton
        label="Input"
        schema={inputSchema}
        active={activePanel?.type === "input" && activePanel.nodeId === node.id}
        onClick={() =>
          setActivePanel(
            activePanel?.type === "input" && activePanel.nodeId === node.id
              ? null
              : { type: "input", nodeId: node.id }
          )
        }
      />
      <DeleteButton nodeId={node.id} />
    </>
  );
}

/* ─── Tool Section ───────────────────────────────────────── */

function ToolSchemaToolbarSection({ node, activePanel, setActivePanel }: SchemaSectionProps) {
  const outputSchema = (node.data.outputSchema as Record<string, unknown> | null) ?? null;
  const inputSchema = (node.data.inputSchema as Record<string, unknown> | null) ?? null;

  return (
    <>
      <Wrench className="w-4 h-4 text-orange-500 dark:text-orange-400 shrink-0" />
      <span className="text-xs text-stone-600 dark:text-slate-300 shrink-0 max-w-32 truncate">
        {node.data.label}
      </span>
      <ToolbarDivider />
      <SchemaStatusButton
        label="Output"
        schema={outputSchema}
        active={activePanel?.type === "output" && activePanel.nodeId === node.id}
        onClick={() =>
          setActivePanel(
            activePanel?.type === "output" && activePanel.nodeId === node.id
              ? null
              : { type: "output", nodeId: node.id }
          )
        }
      />
      <SchemaStatusButton
        label="Input"
        schema={inputSchema}
        active={activePanel?.type === "input" && activePanel.nodeId === node.id}
        onClick={() =>
          setActivePanel(
            activePanel?.type === "input" && activePanel.nodeId === node.id
              ? null
              : { type: "input", nodeId: node.id }
          )
        }
      />
      <DeleteButton nodeId={node.id} />
    </>
  );
}

/* ─── Start Section ──────────────────────────────────────── */

function StartToolbarSection({ node, activePanel, setActivePanel }: SchemaSectionProps) {
  const outputSchema = (node.data.outputSchema as Record<string, unknown> | null) ?? null;

  return (
    <>
      <Play className="w-4 h-4 text-green-500 dark:text-green-400 shrink-0" />
      <span className="text-xs text-stone-600 dark:text-slate-300 shrink-0">
        {node.data.label}
      </span>
      <ToolbarDivider />
      <SchemaStatusButton
        label="Output"
        schema={outputSchema}
        active={activePanel?.type === "output" && activePanel.nodeId === node.id}
        onClick={() =>
          setActivePanel(
            activePanel?.type === "output" && activePanel.nodeId === node.id
              ? null
              : { type: "output", nodeId: node.id }
          )
        }
      />
      <DeleteButton nodeId={node.id} />
    </>
  );
}

/* ─── Finish Section ─────────────────────────────────────── */

function FinishToolbarSection({ node, activePanel, setActivePanel }: SchemaSectionProps) {
  const inputSchema = (node.data.inputSchema as Record<string, unknown> | null) ?? null;

  return (
    <>
      <Flag className="w-4 h-4 text-red-500 dark:text-red-400 shrink-0" />
      <span className="text-xs text-stone-600 dark:text-slate-300 shrink-0">
        {node.data.label}
      </span>
      <ToolbarDivider />
      <SchemaStatusButton
        label="Input"
        schema={inputSchema}
        active={activePanel?.type === "input" && activePanel.nodeId === node.id}
        onClick={() =>
          setActivePanel(
            activePanel?.type === "input" && activePanel.nodeId === node.id
              ? null
              : { type: "input", nodeId: node.id }
          )
        }
      />
      <DeleteButton nodeId={node.id} />
    </>
  );
}

/* ─── Main Toolbar ────────────────────────────────────────── */

const TOOLBAR_NODE_TYPES = [
  "blankBoxNode", "textNode", "conditionNode", "idealStateNode",
  "agentNode", "toolNode", "startNode", "finishNode",
];

export default function ContextToolbar() {
  const selectedNodeId = useWorkflowStore((s) => s.selectedNodeId);
  const nodes = useWorkflowNodes();
  const node = nodes.find((n) => n.id === selectedNodeId);

  const [activePanel, setActivePanel] = useState<{ type: "output" | "input"; nodeId: string } | null>(null);

  // Close panel when selected node changes
  useEffect(() => {
    setActivePanel(null);
  }, [selectedNodeId]);

  const visible = !!node && TOOLBAR_NODE_TYPES.includes(node.type ?? "");

  return (
    <div
      className={cn(
        "overflow-hidden transition-all duration-200 border-b",
        "bg-white dark:bg-slate-900 border-stone-200 dark:border-slate-700",
        visible && activePanel
          ? "max-h-[340px] opacity-100"
          : visible
            ? "max-h-16 opacity-100"
            : "max-h-0 opacity-0"
      )}
    >
      <div className="flex items-center gap-1.5 px-3 h-12 overflow-x-auto overflow-y-hidden scrollbar-hide">
        {node?.type === "blankBoxNode" && <BlankBoxToolbarSection node={node} />}
        {node?.type === "textNode" && <TextToolbarSection node={node} />}
        {node?.type === "conditionNode" && <ConditionToolbarSection node={node} />}
        {node?.type === "idealStateNode" && <IdealStateToolbarSection node={node} />}
        {node?.type === "agentNode" && (
          <AgentToolbarSection node={node} activePanel={activePanel} setActivePanel={setActivePanel} />
        )}
        {node?.type === "toolNode" && (
          <ToolSchemaToolbarSection node={node} activePanel={activePanel} setActivePanel={setActivePanel} />
        )}
        {node?.type === "startNode" && (
          <StartToolbarSection node={node} activePanel={activePanel} setActivePanel={setActivePanel} />
        )}
        {node?.type === "finishNode" && (
          <FinishToolbarSection node={node} activePanel={activePanel} setActivePanel={setActivePanel} />
        )}
      </div>
      {activePanel && node && (
        <SchemaPanel
          nodeId={activePanel.nodeId}
          schemaType={activePanel.type}
          onClose={() => setActivePanel(null)}
        />
      )}
    </div>
  );
}
