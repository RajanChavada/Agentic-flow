"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { LogIn, User, LogOut, ChevronDown } from "lucide-react";
import { useAuthStore, useUser } from "@/store/useAuthStore";
import { useProfile } from "@/store/useProfileStore";

export default function NavProfile() {
  const user = useUser();
  const profile = useProfile();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as HTMLElement)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!user) {
    return (
      <button
        onClick={() =>
          useAuthStore.getState().openAuthModal({
            reason: "Sign in to save your work and manage your profile.",
          })
        }
        className="inline-flex items-center gap-1.5 rounded-lg border border-input bg-background px-3 py-1.5 text-sm font-medium transition hover:bg-muted/50"
      >
        <LogIn className="h-3.5 w-3.5" />
        Sign in
      </button>
    );
  }

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 rounded-lg px-2 py-1 transition hover:bg-muted/50"
        title="Account menu"
      >
        {profile?.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt=""
            className="h-8 w-8 rounded-full object-cover shrink-0"
          />
        ) : (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">
            {(profile?.username_handle ?? user.email ?? "?")
              .slice(0, 2)
              .toUpperCase()}
          </div>
        )}
        <span className="hidden text-sm font-medium sm:inline">
          @{profile?.username_handle ?? user.email?.split("@")[0] ?? "user"}
        </span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 min-w-[180px] rounded-lg border border-border bg-background py-1 shadow-lg z-50"
          role="menu"
        >
          <Link
            href="/settings/profile"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-sm outline-none transition hover:bg-muted/50"
            role="menuitem"
          >
            <User className="h-4 w-4" />
            Profile settings
          </Link>
          <button
            onClick={() => {
              setOpen(false);
              useAuthStore.getState().signOut();
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-left outline-none transition hover:bg-muted/50"
            role="menuitem"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
