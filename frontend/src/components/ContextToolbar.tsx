"use client";
"use no memo";

import React from "react";
import { Trash2 } from "lucide-react";
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
  useProviderData,
  useToolCategoryData,
} from "@/store/useWorkflowStore";

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

/* ─── Agent Section ───────────────────────────────────────── */

const TASK_TYPES = [
  { value: "classification", label: "Classification" },
  { value: "summarization", label: "Summarization" },
  { value: "code_generation", label: "Code Gen" },
  { value: "rag_answer", label: "RAG" },
  { value: "tool_orchestration", label: "Tool Orchestration" },
  { value: "routing", label: "Routing" },
];

const OUTPUT_SIZES = [
  { value: "short", label: "Short" },
  { value: "medium", label: "Medium" },
  { value: "long", label: "Long" },
  { value: "very_long", label: "Very Long" },
];

function AgentToolbarSection({ node }: { node: Node<WorkflowNodeData> }) {
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData);
  const providerData = useProviderData();

  const provider = (node.data.modelProvider as string) ?? "";
  const model = (node.data.modelName as string) ?? "";
  const taskType = (node.data.taskType as string) ?? "";
  const outputSize = (node.data.expectedOutputSize as string) ?? "";
  const calls = (node.data.expectedCallsPerRun as number | null) ?? null;
  const context = (node.data.context as string) ?? "";

  const providers = providerData ?? [];
  const currentProvider = providers.find((p) => p.id === provider);
  const models = currentProvider?.models ?? [];
  const selectedModel = models.find((m) => m.id === model);

  return (
    <>
      <span className="inline-block w-3 h-3 rounded-sm bg-blue-500 shrink-0" />
      <ToolbarInput
        value={node.data.label}
        onChange={(v) => updateNodeData(node.id, { label: v })}
        className="w-28"
        placeholder="Agent name"
      />
      <ToolbarDivider />
      <ToolbarSelect
        value={provider}
        onChange={(v) => updateNodeData(node.id, { modelProvider: v, modelName: "" })}
        options={providers.map((p) => ({ value: p.id, label: p.name }))}
        placeholder="Provider"
        className="w-28"
      />
      <ToolbarSelect
        value={model}
        onChange={(v) => updateNodeData(node.id, { modelName: v })}
        options={models.map((m) => ({ value: m.id, label: m.display_name }))}
        placeholder="Model"
        className="w-32"
      />
      {selectedModel && (
        <span className="text-[9px] font-mono text-stone-500 dark:text-slate-500 shrink-0 whitespace-nowrap">
          ${selectedModel.input_per_million.toFixed(2)} / ${selectedModel.output_per_million.toFixed(2)} per 1M
        </span>
      )}
      <ToolbarDivider />
      <ToolbarSelect
        value={taskType}
        onChange={(v) => updateNodeData(node.id, { taskType: v })}
        options={TASK_TYPES}
        placeholder="Task"
        className="w-28"
      />
      <ToolbarSelect
        value={outputSize}
        onChange={(v) => updateNodeData(node.id, { expectedOutputSize: v })}
        options={OUTPUT_SIZES}
        placeholder="Output"
        className="w-24"
      />
      <ToolbarDivider />
      <input
        type="number"
        value={calls ?? ""}
        onChange={(e) =>
          updateNodeData(node.id, {
            expectedCallsPerRun: e.target.value ? Number(e.target.value) : null,
          })
        }
        placeholder="Loops"
        min={1}
        max={100}
        className={cn(
          "h-7 w-14 rounded border px-1.5 text-xs outline-none shrink-0",
          "bg-stone-50 border-stone-300 text-stone-800 placeholder:text-stone-400 focus:bg-white focus:ring-1 focus:ring-blue-400 focus:border-blue-400",
          "dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 dark:placeholder:text-slate-500"
        )}
      />
      <ToolbarDivider />
      <div className="relative shrink-0">
        <ToolbarInput
          value={context}
          onChange={(v) => updateNodeData(node.id, { context: v })}
          placeholder="Context prompt..."
          className="w-40 pr-8"
          maxLength={500}
        />
        <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[8px] text-stone-400 dark:text-slate-500">
          {context.length}/500
        </span>
      </div>
      <DeleteButton nodeId={node.id} />
    </>
  );
}

/* ─── Tool Section ────────────────────────────────────────── */

function ToolToolbarSection({ node }: { node: Node<WorkflowNodeData> }) {
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData);
  const toolCategoryData = useToolCategoryData();

  const category = (node.data.toolCategory as string) ?? "";
  const toolId = (node.data.toolId as string) ?? "";

  const categories = toolCategoryData ?? [];
  const currentCat = categories.find((c) => c.id === category);
  const tools = currentCat?.tools ?? [];

  return (
    <>
      <span className="inline-block w-3 h-3 rotate-45 rounded-[2px] bg-orange-500 shrink-0" />
      <ToolbarInput
        value={node.data.label}
        onChange={(v) => updateNodeData(node.id, { label: v })}
        className="w-28"
        placeholder="Tool name"
      />
      <ToolbarDivider />
      <ToolbarSelect
        value={category}
        onChange={(v) => updateNodeData(node.id, { toolCategory: v, toolId: "" })}
        options={categories.map((c) => ({ value: c.id, label: c.name }))}
        placeholder="Category"
        className="w-32"
      />
      <ToolbarSelect
        value={toolId}
        onChange={(v) => updateNodeData(node.id, { toolId: v })}
        options={tools.map((t) => ({ value: t.id, label: t.display_name }))}
        placeholder="Tool"
        className="w-36"
      />
      <DeleteButton nodeId={node.id} />
    </>
  );
}

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

/* ─── Main Toolbar ────────────────────────────────────────── */

export default function ContextToolbar() {
  const selectedNodeId = useWorkflowStore((s) => s.selectedNodeId);
  const nodes = useWorkflowNodes();
  const node = nodes.find((n) => n.id === selectedNodeId);

  const visible =
    !!node && !["startNode", "finishNode"].includes(node.type ?? "");

  return (
    <div
      className={cn(
        "overflow-hidden transition-all duration-200 border-b",
        "bg-white dark:bg-slate-900 border-stone-200 dark:border-slate-700",
        visible ? "max-h-16 opacity-100" : "max-h-0 opacity-0"
      )}
    >
      <div className="flex items-center gap-1.5 px-3 h-12 overflow-x-auto overflow-y-hidden scrollbar-hide">
        {node?.type === "agentNode" && <AgentToolbarSection node={node} />}
        {node?.type === "toolNode" && <ToolToolbarSection node={node} />}
        {node?.type === "blankBoxNode" && <BlankBoxToolbarSection node={node} />}
        {node?.type === "textNode" && <TextToolbarSection node={node} />}
      </div>
    </div>
  );
}
