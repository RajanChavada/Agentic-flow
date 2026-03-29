"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { LogIn, User, LogOut, ChevronDown, CreditCard } from "lucide-react";
import { useAuthStore, useUser } from "@/store/useAuthStore";
import { useProfile } from "@/store/useProfileStore";
import { useSubscriptionStore } from "@/store/useSubscriptionStore";

export default function NavProfile() {
  const user = useUser();
  const profile = useProfile();
  const { stripeCustomerId } = useSubscriptionStore();
  const [open, setOpen] = useState(false);
  const [managingSubscription, setManagingSubscription] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as HTMLElement)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleManageSubscription = async () => {
    if (!stripeCustomerId) {
      setOpen(false);
      return;
    }

    setManagingSubscription(true);
    try {
      const res = await fetch(`${API_BASE}/api/stripe/create-portal-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stripeCustomerId }),
      });
      const { url } = await res.json();
      window.location.href = url;
    } catch (error) {
      console.error("Failed to create portal session:", error);
      setManagingSubscription(false);
      setOpen(false);
    }
  };

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
          {stripeCustomerId && (
            <button
              onClick={() => {
                setOpen(false);
                handleManageSubscription();
              }}
              disabled={managingSubscription}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-left outline-none transition hover:bg-muted/50 disabled:opacity-50"
              role="menuitem"
            >
              <CreditCard className="h-4 w-4" />
              {managingSubscription ? "Opening…" : "Manage subscription"}
            </button>
          )}
          <Link
            href="/profile"
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
