"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";

/** Brief "Signed out" confirmation toast. Auto-dismisses after 2.5s. */
export default function SignOutToast() {
  const signOutMessage = useAuthStore((s) => s.signOutMessage);
  const clearSignOutMessage = useAuthStore((s) => s.clearSignOutMessage);

  useEffect(() => {
    if (!signOutMessage) return;
    const t = setTimeout(clearSignOutMessage, 2500);
    return () => clearTimeout(t);
  }, [signOutMessage, clearSignOutMessage]);

  if (!signOutMessage) return null;

  return (
    <div
      className="fixed bottom-6 left-1/2 z-[100] -translate-x-1/2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium shadow-lg"
      role="status"
    >
      {signOutMessage}
    </div>
  );
}
