"use client";

import React from "react";
import { X } from "lucide-react";
import { useUIState } from "@/store/useWorkflowStore";
import { cn } from "@/lib/utils";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
}: Props) {
  const { theme } = useUIState();
  const isDark = theme === "dark";

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className={cn(
          "w-full max-w-sm rounded-lg border p-6 shadow-xl",
          isDark ? "border-gray-700 bg-gray-900" : "border-gray-200 bg-white"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <button
            onClick={onClose}
            className={cn(
              "rounded p-1 transition-colors",
              isDark ? "hover:bg-gray-800" : "hover:bg-gray-100"
            )}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="mb-6 text-sm text-muted-foreground">{message}</p>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className={cn(
              "rounded-md border px-4 py-2 text-sm font-medium transition",
              isDark
                ? "border-gray-600 text-gray-300 hover:bg-gray-800"
                : "border-gray-300 text-gray-600 hover:bg-gray-100"
            )}
          >
            {cancelLabel}
          </button>
          <button
            onClick={handleConfirm}
            className={cn(
              "rounded-md px-4 py-2 text-sm font-medium text-white transition",
              variant === "destructive"
                ? "bg-red-600 hover:bg-red-700"
                : "bg-blue-600 hover:bg-blue-700"
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
