"use client";

import React, { useState, useCallback } from "react";
import { Upload, Loader2 } from "lucide-react";

const DICEBEAR_BASE = "https://api.dicebear.com/7.x/avataaars/svg";
const PRESET_SEEDS = [
  "alex",
  "alexa",
  "jordan",
  "jane",
  "bob",
  "anna",
  "felix",
  "maya",
  "max",
  "luna",
  "rocky",
  "sam",
];

function dicebearUrl(seed: string): string {
  return `${DICEBEAR_BASE}?seed=${encodeURIComponent(seed)}`;
}

interface AvatarPickerProps {
  currentUrl: string | null;
  onSelect: (url: string, type: "upload" | "preset") => void;
  onUpload: (file: File) => Promise<void>;
  isDark?: boolean;
}

export default function AvatarPicker({
  currentUrl,
  onSelect,
  onUpload,
  isDark = false,
}: AvatarPickerProps) {
  const [tab, setTab] = useState<"upload" | "preset">("preset");
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      const valid = ["image/jpeg", "image/png", "image/gif", "image/webp"].includes(file.type);
      if (!valid) {
        setUploadError("Please use JPEG, PNG, GIF, or WebP.");
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        setUploadError("Image must be under 2MB.");
        return;
      }
      setUploadError(null);
      setUploading(true);
      try {
        await onUpload(file);
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [onUpload]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      e.target.value = "";
    },
    [handleFile]
  );

  const borderClass = isDark ? "border-slate-700" : "border-gray-200";
  const bgClass = isDark ? "bg-slate-900" : "bg-white";
  const textClass = isDark ? "text-slate-100" : "text-gray-800";
  const mutedClass = isDark ? "text-slate-400" : "text-gray-500";

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b border-gray-200 dark:border-slate-700">
        <button
          type="button"
          onClick={() => setTab("upload")}
          className={`px-3 py-2 text-sm font-medium transition border-b-2 -mb-px ${
            tab === "upload"
              ? "border-blue-500 text-blue-600 dark:text-blue-400"
              : `${mutedClass} border-transparent hover:text-foreground`
          }`}
        >
          Upload
        </button>
        <button
          type="button"
          onClick={() => setTab("preset")}
          className={`px-3 py-2 text-sm font-medium transition border-b-2 -mb-px ${
            tab === "preset"
              ? "border-blue-500 text-blue-600 dark:text-blue-400"
              : `${mutedClass} border-transparent hover:text-foreground`
          }`}
        >
          Preset
        </button>
      </div>

      {tab === "upload" && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`rounded-lg border-2 border-dashed p-8 text-center transition ${
            dragOver
              ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 dark:border-blue-500"
              : `${borderClass} ${isDark ? "bg-slate-800/50" : "bg-gray-50"}`
          }`}
        >
          <input
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleInputChange}
            className="hidden"
            id="avatar-upload"
          />
          <label
            htmlFor="avatar-upload"
            className="cursor-pointer flex flex-col items-center gap-2"
          >
            {uploading ? (
              <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
            ) : (
              <Upload className={`h-10 w-10 ${mutedClass}`} />
            )}
            <span className={`text-sm ${mutedClass}`}>
              {uploading ? "Uploading..." : "Drag and drop or click to upload"}
            </span>
            <span className={`text-xs ${mutedClass}`}>JPEG, PNG, GIF, WebP — max 2MB</span>
          </label>
          {uploadError && (
            <p className="mt-2 text-sm text-red-500">{uploadError}</p>
          )}
        </div>
      )}

      {tab === "preset" && (
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
          {PRESET_SEEDS.map((seed) => {
            const url = dicebearUrl(seed);
            const isSelected = currentUrl === url;
            return (
              <button
                key={seed}
                type="button"
                onClick={() => onSelect(url, "preset")}
                className={`relative rounded-lg overflow-hidden border-2 transition hover:scale-105 ${
                  isSelected
                    ? "border-blue-500 ring-2 ring-blue-500/30"
                    : `${borderClass} hover:border-blue-400`
                }`}
              >
                <img
                  src={url}
                  alt={`Avatar ${seed}`}
                  className="w-full aspect-square object-cover"
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
