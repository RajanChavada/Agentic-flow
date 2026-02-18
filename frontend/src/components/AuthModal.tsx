/**
 * AuthModal — sign-in / sign-up modal with email and
 * OAuth (Google, GitHub) support.
 *
 * Shown when an unauthenticated user tries to Save, Export, or Import.
 * Uses Supabase Auth directly — no backend route required.
 */

"use client";

import React, { useState } from "react";
import {
  X,
  LogIn,
  UserPlus,
  AlertCircle,
  Loader2,
  Github,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuthStore, useAuthModalOpen, useAuthModalReason } from "@/store/useAuthStore";
import { useUIState } from "@/store/useWorkflowStore";

// ── OAuth provider config ────────────────────────────────────
type OAuthProvider = "google" | "github";

interface ProviderButton {
  id: OAuthProvider;
  label: string;
  icon: React.ReactNode;
  bgClass: string;
  hoverClass: string;
}

const OAUTH_PROVIDERS: ProviderButton[] = [
  {
    id: "google",
    label: "Google",
    icon: (
      // Inline Google "G" SVG — Lucide doesn't include brand icons
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
      </svg>
    ),
    bgClass: "bg-white border-gray-300 text-gray-700",
    hoverClass: "hover:bg-gray-50",
  },
  {
    id: "github",
    label: "GitHub",
    icon: <Github className="w-4 h-4" />,
    bgClass: "bg-gray-900 border-gray-900 text-white",
    hoverClass: "hover:bg-gray-800",
  },
];

export default function AuthModal() {
  const open = useAuthModalOpen();
  const reason = useAuthModalReason();
  const closeAuthModal = useAuthStore((s) => s.closeAuthModal);
  const { theme } = useUIState();
  const isDark = theme === "dark";

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = useState(false);

  if (!open) return null;

  // ── Email / password ──────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "signup") {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) throw signUpError;
        setConfirmationSent(true);
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  // ── OAuth (Google, GitHub, Microsoft) ─────────────────────
  const handleOAuth = async (provider: OAuthProvider) => {
    setError(null);
    setOauthLoading(provider);
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (oauthError) throw oauthError;
      // Browser will redirect to provider's consent screen
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : `${provider} login failed`);
      setOauthLoading(null);
    }
  };

  const reset = () => {
    setEmail("");
    setPassword("");
    setError(null);
    setConfirmationSent(false);
  };

  const switchMode = () => {
    setMode((m) => (m === "signin" ? "signup" : "signin"));
    reset();
  };

  // ── Divider helper ────────────────────────────────────────
  const Divider = ({ text }: { text: string }) => (
    <div className="flex items-center gap-3 my-3">
      <div className={`flex-1 h-px ${isDark ? "bg-slate-700" : "bg-gray-200"}`} />
      <span className={`text-[10px] uppercase tracking-wide ${isDark ? "text-slate-500" : "text-gray-400"}`}>
        {text}
      </span>
      <div className={`flex-1 h-px ${isDark ? "bg-slate-700" : "bg-gray-200"}`} />
    </div>
  );

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        className={`relative w-full max-w-sm rounded-xl border shadow-2xl p-6 max-h-[90vh] overflow-y-auto ${
          isDark
            ? "border-slate-700 bg-slate-900 text-slate-100"
            : "border-gray-200 bg-white text-gray-800"
        }`}
      >
        {/* Close button */}
        <button
          onClick={closeAuthModal}
          className={`absolute top-3 right-3 p-1 rounded-md transition ${
            isDark ? "hover:bg-slate-800 text-slate-400" : "hover:bg-gray-100 text-gray-400"
          }`}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <h2 className="text-lg font-bold mb-1">
          {mode === "signin" ? (
            <><LogIn className="inline w-5 h-5 mr-1.5 -mt-0.5" />Sign In</>
          ) : (
            <><UserPlus className="inline w-5 h-5 mr-1.5 -mt-0.5" />Create Account</>
          )}
        </h2>

        {reason && (
          <p className={`text-xs mb-3 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
            {reason}
          </p>
        )}

        {/* Error banner */}
        {error && (
          <div
            className={`flex items-start gap-2 rounded-md border px-3 py-2 text-xs mb-3 ${
              isDark
                ? "border-red-800 bg-red-900/30 text-red-300"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Confirmation sent */}
        {confirmationSent ? (
          <div className="text-center py-4">
            <p className={`text-sm ${isDark ? "text-green-400" : "text-green-600"}`}>
              Check your email for a confirmation link!
            </p>
            <button
              onClick={() => { setMode("signin"); reset(); }}
              className="mt-3 text-xs text-blue-500 underline"
            >
              Back to Sign In
            </button>
          </div>
        ) : (
          <>
            {/* ── OAuth providers ────────────────────────── */}
            <div className="flex flex-col gap-2">
              {OAUTH_PROVIDERS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleOAuth(p.id)}
                  disabled={oauthLoading !== null}
                  className={`flex items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition disabled:opacity-50 ${
                    isDark
                      ? "border-slate-600 bg-slate-800 text-slate-100 hover:bg-slate-700"
                      : `${p.bgClass} ${p.hoverClass}`
                  }`}
                >
                  {oauthLoading === p.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    p.icon
                  )}
                  Continue with {p.label}
                </button>
              ))}
            </div>

            <Divider text="or use email" />

            {/* ── Email / password form ──────────────────── */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <label className="flex flex-col gap-1">
                <span className={`text-xs font-medium ${isDark ? "text-slate-300" : "text-gray-600"}`}>
                  Email
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`rounded-md border px-3 py-2 text-sm outline-none transition ${
                    isDark
                      ? "border-slate-600 bg-slate-800 text-slate-100 focus:border-blue-500"
                      : "border-gray-300 bg-white text-gray-800 focus:border-blue-500"
                  }`}
                  placeholder="you@example.com"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className={`text-xs font-medium ${isDark ? "text-slate-300" : "text-gray-600"}`}>
                  Password
                </span>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`rounded-md border px-3 py-2 text-sm outline-none transition ${
                    isDark
                      ? "border-slate-600 bg-slate-800 text-slate-100 focus:border-blue-500"
                      : "border-gray-300 bg-white text-gray-800 focus:border-blue-500"
                  }`}
                  placeholder="Min 6 characters"
                />
              </label>

              <button
                type="submit"
                disabled={loading}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {mode === "signin" ? "Sign In" : "Create Account"}
              </button>

              <p className={`text-xs text-center ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                {mode === "signin" ? "Don't have an account?" : "Already have an account?"}{" "}
                <button type="button" onClick={switchMode} className="text-blue-500 underline">
                  {mode === "signin" ? "Sign Up" : "Sign In"}
                </button>
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
